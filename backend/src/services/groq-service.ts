import Groq from 'groq-sdk'
import { LLMRequest, LLMResponse } from '../types'

export interface GroqConfig {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
}

/**
 * Serviço específico para Groq - usado para resumos e explicações
 * Otimizado para tarefas de sumarização e análise de resultados
 */
export class GroqService {
  private static instance: GroqService
  private groq: Groq
  private availableModels: string[] = [
    'llama-3.3-70b-versatile',  // Modelo principal para resumos
    'llama-3.1-8b-instant',     // Modelo rápido para tarefas simples
  ]

  private constructor() {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY é obrigatória! Verifique o arquivo .env')
    }

    this.groq = new Groq({
      apiKey: apiKey
    })
  }

  static getInstance(): GroqService {
    if (!GroqService.instance) {
      GroqService.instance = new GroqService()
    }
    return GroqService.instance
  }

  /**
   * Gera resumo de consulta SQL
   */
  async generateSQLSummary(params: {
    question: string
    sql: string
    model?: string
  }): Promise<LLMResponse> {
    const { question, sql, model = 'llama-3.3-70b-versatile' } = params

    const prompt = `Gere uma explicação curta e amigável, em uma única frase, para a seguinte consulta SQL. Diga ao usuário o que a consulta irá buscar, sem usar termos técnicos ou repetir o SQL.

Pergunta original: "${question}"

Consulta SQL: ${sql}

Explicação amigável:`

    return await this.generateResponse({
      prompt,
      model,
      context: { type: 'sql_summary' }
    })
  }

  /**
   * Gera resumo de resultados de consulta
   */
  async generateResultSummary(params: {
    originalPrompt: string
    query: string
    result: any
    model?: string
  }): Promise<LLMResponse> {
    const { originalPrompt, query, result, model = 'llama-3.3-70b-versatile' } = params

    // Construir descrição dos dados retornados (primeiras linhas como exemplo)
    const dataDescription = this.buildDataDescription(result)

    const prompt = `Analise esta consulta SQL executada e gere um resumo analítico com insights.

PERGUNTA ORIGINAL DO USUÁRIO:
"${originalPrompt}"

CONSULTA SQL EXECUTADA:
\`\`\`sql
${query}
\`\`\`

RESULTADOS OBTIDOS:
- Número de registros: ${result.rowCount}
- Colunas: ${result.columns.join(', ')}
- Tempo de execução: ${result.executionTime}ms

DADOS (primeiras 5 linhas):
${result.rows.slice(0, 5).map((row: any[], index: number) =>
    `${index + 1}. ${result.columns.map((col: string, i: number) => `${col}: ${row[i]}`).join(', ')}`
  ).join('\n')}

${dataDescription}

INSTRUÇÕES:
Gere um resumo analítico em português que:
1. Responda diretamente à pergunta original
2. Destaque os principais insights dos dados
3. Mencione padrões ou tendências relevantes
4. Use linguagem acessível para educadores
5. Seja conciso mas informativo (máximo 3 parágrafos)

RESUMO ANALÍTICO:`

    return await this.generateResponse({
      prompt,
      model,
      context: { type: 'result_summary' }
    })
  }

  /**
   * Gera explicação amigável de erro SQL
   */
  async generateErrorExplanation(params: {
    originalPrompt: string
    query: string
    error: string
    model?: string
  }): Promise<LLMResponse> {
    const { originalPrompt, query, error, model = 'llama-3.3-70b-versatile' } = params

    const prompt = `Você é um assistente especializado em dados educacionais do INEP. Analise este erro de consulta SQL e ajude o usuário reformulando sua pergunta original.

PERGUNTA ORIGINAL DO USUÁRIO:
"${originalPrompt}"

CONSULTA SQL QUE GEROU ERRO:
\`\`\`sql
${query}
\`\`\`

ERRO RETORNADO PELO BANCO:
${error}

INSTRUÇÕES:
Analise a intenção da pergunta original do usuário e sugira versões reformuladas da mesma pergunta que evitariam o erro. Sua resposta deve:

1. **Explicar brevemente o que deu errado** (1 frase simples)
2. **Sugerir 2-3 versões melhoradas da pergunta original** que conseguiriam obter a informação desejada
3. **Manter a intenção original** do usuário, apenas ajustando para funcionar com os dados disponíveis
4. **Usar tom conversacional** e amigável

FORMATO DA RESPOSTA:
- Primeira linha: Explicação breve do problema
- Depois: "Tente reformular sua pergunta assim:"
- Lista de 2-3 versões melhoradas da pergunta original

EXEMPLO:
Se a pergunta original foi "Mostre os nomes dos cursos de 2023" mas a coluna 'nome_curso' não existe:

"Parece que a coluna 'nome_curso' não existe na tabela.

Tente reformular sua pergunta assim:
• "Mostre os cursos oferecidos em 2023"
• "Quais são os cursos disponíveis em 2023?"
• "Liste todos os cursos do ano de 2023""

RESPOSTA:`

    return await this.generateResponse({
      prompt,
      model,
      context: { type: 'error_explanation' }
    })
  }

  /**
   * Método principal para gerar respostas com Groq
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, model = 'llama-3.3-70b-versatile' } = request

    try {
      console.log(`🔄 Gerando resposta com Groq modelo: ${model}`)

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: model,
        temperature: 0.3, // Mais conservador para resumos
        max_tokens: 2048,
        top_p: 0.9
      })

      const content = completion.choices[0]?.message?.content

      if (!content) {
        throw new Error('Resposta vazia do Groq')
      }

      console.log(`✅ Resposta bem-sucedida do Groq (${model})`)
      return {
        success: true,
        content: content.trim(),
        model,
        provider: 'groq',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      }

    } catch (error: any) {
      console.error(`❌ Erro no Groq (${model}):`, error)

      return {
        success: false,
        error: error.message || 'Erro desconhecido do Groq',
        model,
        provider: 'groq',
        isRateLimit: this.isRateLimitError(error)
      }
    }
  }

  /**
   * Verifica se o erro é de rate limit
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false

    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status

    return (
      errorCode === 429 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('too many requests')
    )
  }

  /**
   * Constrói descrição dos dados para resumo
   */
  private buildDataDescription(result: any): string {
    if (!result.rows || result.rows.length === 0) {
      return "OBSERVAÇÃO: Nenhum resultado encontrado para os critérios especificados."
    }

    const sampleSize = Math.min(3, result.rows.length)
    const hasMoreData = result.rows.length > sampleSize

    let description = `AMOSTRA DOS DADOS (${sampleSize} de ${result.rows.length} registros):\n`

    for (let i = 0; i < sampleSize; i++) {
      const row = result.rows[i]
      const rowDescription = result.columns
        .map((col: string, index: number) => `${col}: ${row[index]}`)
        .join(', ')
      description += `${i + 1}. ${rowDescription}\n`
    }

    if (hasMoreData) {
      description += `... e mais ${result.rows.length - sampleSize} registros.`
    }

    return description
  }

  /**
   * Obtém modelos disponíveis
   */
  getAvailableModels(): string[] {
    return [...this.availableModels]
  }
}
