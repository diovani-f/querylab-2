import { LLMRequest, LLMResponse, QueryResult } from '../types'
import { PrismaClient, LLMModel } from '@prisma/client'
import { GeminiService } from './gemini-service'
import { GroqService } from './groq-service'

export class LLMService {
  private prisma: PrismaClient
  private static instance: LLMService
  private geminiService: GeminiService
  private groqService?: GroqService
  private availableModels: LLMModel[] = []

  private constructor() {
    this.prisma = new PrismaClient()

    // Inicializar Gemini como provider principal
    try {
      this.geminiService = GeminiService.getInstance()
      console.log('✅ Gemini inicializado como provider principal')
    } catch (error) {
      console.error('❌ Falha ao inicializar Gemini:', error)
      throw new Error('GEMINI_API_KEY é obrigatória! Verifique o arquivo .env')
    }

    // Inicializar Groq para resumos
    try {
      this.groqService = GroqService.getInstance()
      console.log('✅ Groq inicializado para resumos')
    } catch (error) {
      console.error('❌ Falha ao inicializar Groq:', error)
      console.warn('⚠️ Groq não disponível - resumos usarão Gemini como fallback')
    }
  }

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService()
    }
    return LLMService.instance
  }

  public async populateModels() {
    try {
      this.availableModels = await this.prisma.lLMModel.findMany()
    } catch (error) {
      console.error('❌ Erro ao carregar modelos do banco:', error)
    }
  }

  getAvailableModels(): LLMModel[] {
    // Organizar modelos: primeiro Gemini (padrão), depois Groq (fallback), depois outros providers
    const sortedModels = [...this.availableModels].sort((a, b) => {
      // Definir ordem de prioridade dos providers
      const providerOrder: Record<string, number> = {
        'gemini': 1,
        'groq': 2,
        'cloudflare': 3,
        'openai': 4,
        'anthropic': 5,
        'local': 6
      }

      const aOrder = providerOrder[a.provider] || 999
      const bOrder = providerOrder[b.provider] || 999

      // Se são do mesmo provider, ordenar alfabeticamente pelo nome
      if (aOrder === bOrder) {
        return a.name.localeCompare(b.name)
      }

      // Caso contrário, ordenar pela prioridade do provider
      return aOrder - bOrder
    })

    return sortedModels
  }

  async getDefaultModel(): Promise<LLMModel | null> {
    const defaultModel = await this.prisma.lLMModel.findFirst({
      where: { isDefault: true }
    })

    if (!defaultModel) {
      return this.prisma.lLMModel.findFirst()
    }

    return defaultModel
  }

  getModelSelected(modelId: string): LLMModel | null {
    const selectedModel = this.availableModels.find(model => model.id === modelId)
    if (selectedModel) {
      return selectedModel
    }
    return this.availableModels[0] || null
  }

  /**
   * Retorna temperatura otimizada baseada no modelo e tipo de tarefa
   */
  private getOptimalTemperature(model: string): number {
    // Para modelos maiores, usar temperatura mais baixa para consistência
    if (model.includes('70b') || model.includes('versatile')) {
      return 0.1 // Mais determinístico para modelos inteligentes
    }
    // Para modelos menores, usar temperatura ligeiramente maior
    if (model.includes('8b') || model.includes('instant')) {
      return 0.3 // Mais criatividade para compensar menor capacidade
    }
    return 0.2 // Padrão balanceado
  }

  /**
   * Retorna max_tokens otimizado baseado no modelo
   */
  private getOptimalMaxTokens(model: string): number {
    // Para modelos maiores, permitir mais tokens
    if (model.includes('70b') || model.includes('versatile')) {
      return 1500 // Respostas mais elaboradas
    }
    // Para modelos menores, limitar tokens
    if (model.includes('8b') || model.includes('instant')) {
      return 800 // Respostas mais concisas
    }
    return 1000 // Padrão
  }

  /**
   * Método principal para chamar LLM usando Gemini com fallback interno
   */
  async handlePrompt(request: LLMRequest): Promise<LLMResponse> {
    try {
      const isGroqModel = request.model?.toLowerCase().includes('llama') ||
        request.model?.toLowerCase().includes('mixtral') ||
        request.model?.toLowerCase().includes('gemma');

      if (isGroqModel && this.groqService) {
        console.log(`🔄 Processando prompt com Groq (modelo: ${request.model})...`)
        const response = await this.groqService.generateResponse(request)

        if (response.success) {
          console.log('✅ Resposta bem-sucedida do Groq')
          return response
        }
        console.error('❌ Falha no Groq:', response.error)
        return response
      }

      // Fluxo principal para Gemini
      console.log(`🔄 Processando prompt com Gemini (modelo: ${request.model || 'default'})...`)
      const response = await this.geminiService.generateResponse(request)

      if (response.success) {
        console.log('✅ Resposta bem-sucedida do Gemini')
        return response
      }

      console.error('❌ Falha no Gemini:', response.error)

      if (response.error && response.error.includes('429') && this.groqService) {
        console.log('🔄 Rate Limit no Gemini detectado. Fazendo fallback para Groq automático...')
        const fallbackResponse = await this.groqService.generateResponse({
          ...request,
          model: 'llama-3.3-70b-versatile'
        })
        if (fallbackResponse.success) {
          console.log('✅ Resposta bem-sucedida no fallback do Groq')
          return fallbackResponse
        }
      }

      return response

    } catch (error) {
      console.error('❌ Erro inesperado no LLMService:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        model: request.model || 'gemini-2.5-flash-lite',
        provider: 'gemini'
      }
    }
  }



  /**
   * Gera uma explicação sucinta e amigável da consulta SQL para o usuário leigo.
   * Usa Groq preferencialmente, com fallback para Gemini
   */
  public async generateQueryExplanation(params: {
    prompt: string
    sql: string
  }): Promise<string> {
    const { prompt, sql } = params
    if (!sql) return ''

    try {
      // Tentar usar Groq primeiro (otimizado para resumos)
      if (this.groqService) {
        console.log('🔄 Gerando explicação com Groq...')
        const groqResponse = await this.groqService.generateSQLSummary({
          question: prompt,
          sql
        })

        if (groqResponse.success && groqResponse.content) {
          console.log('✅ Explicação gerada com Groq')
          return groqResponse.content.trim()
        }
      }

      // Fallback para Gemini
      console.log('🔄 Gerando explicação com Gemini (fallback)...')
      const explanationPrompt = `Gere uma explicação curta e amigável, em uma única frase, para a seguinte consulta SQL. Diga ao usuário o que a consulta irá buscar, sem usar termos técnicos ou repetir o SQL.

    Pergunta original: "${prompt}"

    Consulta SQL: ${sql}

    Explicação amigável:`

      const response = await this.handlePrompt({
        prompt: explanationPrompt,
        model: 'gemini-2.5-flash-lite'
      })

      if (response.success && response.content) {
        return response.content.trim()
      }

      return 'Não foi possível gerar uma explicação para a consulta.'
    } catch (error) {
      console.error('❌ Erro ao gerar explicação da query:', error)
      return 'Não foi possível gerar uma explicação para a consulta.'
    }
  }

  /**
   * Gera uma explicação detalhada e técnica dos resultados de uma consulta.
   * Usa Groq preferencialmente, com fallback para Gemini
   */
  async generateDetailedResultExplanation(params: {
    query: string
    result: any
    originalPrompt: string
  }): Promise<{ success: boolean; explanation?: string; error?: string }> {
    try {
      const { query, result, originalPrompt } = params

      // Tentar usar Groq primeiro (otimizado para resumos)
      if (this.groqService) {
        console.log('🔄 Gerando resumo detalhado com Groq...')
        const groqResponse = await this.groqService.generateResultSummary({
          originalPrompt,
          query,
          result
        })

        if (groqResponse.success && groqResponse.content) {
          console.log('✅ Resumo detalhado gerado com Groq')
          return { success: true, explanation: groqResponse.content.trim() }
        }
      }

      // Fallback para Gemini
      console.log('🔄 Gerando resumo detalhado com Gemini (fallback)...')
      const explanationPrompt = `
Você é um assistente especializado em análise de dados. Sua tarefa é fornecer uma explicação técnica e detalhada de um resultado de consulta SQL.

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

INSTRUÇÕES:
1. Responda em português brasileiro.
2. Forneça uma análise técnica do resultado, explicando o que foi encontrado.
3. Mencione os dados-chave nas primeiras linhas.
4. Explique o significado dos dados e como eles se relacionam com a pergunta original.
5. Mencione o número total de registros encontrados.
6. Mantenha a resposta focada na interpretação técnica dos dados, não na consulta em si.
7. NÃO repita o SQL na resposta.

Explicação detalhada dos resultados:`

      const response = await this.handlePrompt({
        prompt: explanationPrompt,
        model: 'gemini-2.5-flash-lite'
      })

      if (response.success && response.content) {
        return { success: true, explanation: response.content.trim() }
      }

      return { success: false, error: response.error || 'Não foi possível gerar explicação detalhada' }
    } catch (error) {
      console.error('❌ Erro ao gerar explicação detalhada:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  }

  /**
   * Gera explicação amigável de erro SQL usando Groq preferencialmente
   */
  public async generateErrorExplanation(params: {
    originalPrompt: string
    sql: string
    error: string
  }): Promise<string> {
    const { originalPrompt, sql, error } = params

    try {
      // Tentar usar Groq primeiro (otimizado para explicações)
      if (this.groqService) {
        console.log('🔄 Gerando explicação de erro com Groq...')
        const groqResponse = await this.groqService.generateErrorExplanation({
          originalPrompt,
          query: sql,
          error
        })

        if (groqResponse.success && groqResponse.content) {
          console.log('✅ Explicação de erro gerada com Groq')
          return groqResponse.content.trim()
        }
      }

      // Fallback para Gemini
      console.log('🔄 Gerando explicação de erro com Gemini (fallback)...')
      const errorPrompt = `Você é um assistente especializado em dados educacionais do INEP. Analise este erro de consulta SQL e ajude o usuário reformulando sua pergunta original.

PERGUNTA ORIGINAL DO USUÁRIO:
"${originalPrompt}"

CONSULTA SQL QUE GEROU ERRO:
\`\`\`sql
${sql}
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

      const response = await this.handlePrompt({
        prompt: errorPrompt,
        model: 'gemini-2.5-flash-lite'
      })

      if (response.success && response.content) {
        return response.content.trim()
      }

      return 'Não foi possível gerar uma explicação para este erro.'
    } catch (error) {
      console.error('❌ Erro ao gerar explicação de erro:', error)
      return 'Não foi possível gerar uma explicação para este erro.'
    }
  }

  /**
   * Gera uma tradução reversa (reverse translation) do SQL executado para linguagem natural.
   * Explica o que foi executado e os resultados obtidos de forma amigável.
   */
  public async generateReverseTranslation(params: {
    sql: string
    result: QueryResult
    originalPrompt?: string
  }): Promise<string> {
    const { sql, result, originalPrompt } = params

    if (!sql || !result.success) {
      return ''
    }

    // Construir descrição dos resultados
    const resultDescription = result.rowCount === 0
      ? 'nenhum resultado foi encontrado'
      : `${result.rowCount} registro${result.rowCount !== 1 ? 's' : ''} ${result.rowCount === 1 ? 'foi encontrado' : 'foram encontrados'}`

    // Construir descrição das tabelas envolvidas
    const tablesInvolved = this.extractTablesFromSQL(sql)
    const tablesDescription = tablesInvolved.length > 0
      ? `da${tablesInvolved.length > 1 ? 's' : ''} tabela${tablesInvolved.length > 1 ? 's' : ''} ${tablesInvolved.join(', ')}`
      : 'do banco de dados'

    // Construir descrição dos JOINs
    const joinDescription = this.extractJoinsFromSQL(sql)

    // Construir descrição dos filtros WHERE
    const whereDescription = this.extractWhereFromSQL(sql)

    // Construir descrição dos dados retornados (primeiras linhas como exemplo)
    const dataDescription = this.buildDataDescription(result)

    const reverseTranslationPrompt = `Analise esta consulta SQL executada e gere um resumo analítico com insights.

SQL EXECUTADO: ${sql}
RESULTADO: ${resultDescription}
${dataDescription}

INSTRUÇÕES:
- Gere um resumo analítico de 2-3 frases
- Foque em INSIGHTS e ANÁLISE dos dados, não apenas o que foi consultado
- Destaque padrões, tendências ou informações relevantes dos resultados
- Use linguagem natural e amigável
- Evite repetir informações óbvias
- Se possível, contextualize os números (ex: "representa X% do total", "indica crescimento", etc.)

EXEMPLOS:
- Em vez de: "Consultou cursos e encontrou 150 registros"
- Prefira: "Foram identificados 150 cursos de pedagogia, representando uma oferta significativa nesta área educacional"

- Em vez de: "Consultou universidades por estado"
- Prefira: "São Paulo lidera com 45 universidades, seguido por MG (32) e RJ (28), mostrando concentração no Sudeste"

Resumo analítico:`

    try {
      // Tentar usar Groq primeiro (otimizado para resumos)
      if (this.groqService) {
        console.log('🔄 Gerando reverse translation com Groq...')
        const groqResponse = await this.groqService.generateResultSummary({
          originalPrompt: originalPrompt || 'Consulta SQL',
          query: sql,
          result
        })

        if (groqResponse.success && groqResponse.content) {
          console.log('✅ Reverse translation gerada com Groq')
          return groqResponse.content.trim()
        }
      }

      // Fallback para Gemini
      console.log('🔄 Gerando reverse translation com Gemini (fallback)...')
      const response = await this.handlePrompt({
        prompt: reverseTranslationPrompt,
        model: 'gemini-2.5-flash-lite'
      })

      if (response.success && response.content) {
        return response.content.trim()
      }

      // Fallback para uma explicação básica e direta
      return `Consultou ${tablesDescription} e ${resultDescription}.`
    } catch (error) {
      console.error('❌ Erro ao gerar reverse translation:', error)
      // Fallback para uma explicação básica e direta
      return `Consultou ${tablesDescription} e ${resultDescription}.`
    }
  }

  /**
   * Extrai nomes de tabelas do SQL
   */
  private extractTablesFromSQL(sql: string): string[] {
    const tables: string[] = []
    const sqlLower = sql.toLowerCase()

    // Buscar padrões FROM e JOIN
    const fromMatch = sqlLower.match(/from\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/g)
    const joinMatch = sqlLower.match(/join\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/g)

    if (fromMatch) {
      fromMatch.forEach(match => {
        const tableName = match.replace(/from\s+/i, '').trim()
        if (tableName && !tables.includes(tableName)) {
          tables.push(tableName)
        }
      })
    }

    if (joinMatch) {
      joinMatch.forEach(match => {
        const tableName = match.replace(/join\s+/i, '').trim()
        if (tableName && !tables.includes(tableName)) {
          tables.push(tableName)
        }
      })
    }

    return tables
  }

  /**
   * Extrai informações sobre JOINs do SQL
   */
  private extractJoinsFromSQL(sql: string): string {
    const sqlLower = sql.toLowerCase()
    const joinCount = (sqlLower.match(/join\s+/g) || []).length

    if (joinCount === 0) {
      return ''
    } else if (joinCount === 1) {
      return ' com relacionamento entre tabelas'
    } else {
      return ` com relacionamentos entre múltiplas tabelas`
    }
  }

  /**
   * Extrai informações sobre filtros WHERE do SQL
   */
  private extractWhereFromSQL(sql: string): string {
    const sqlLower = sql.toLowerCase()

    if (!sqlLower.includes('where')) {
      return ''
    }

    // Contar condições aproximadamente
    const whereClause = sqlLower.split('where')[1]?.split(/group by|order by|limit|having/)[0] || ''
    const conditionCount = (whereClause.match(/and|or/g) || []).length + 1

    if (conditionCount === 1) {
      return ' aplicando um filtro específico'
    } else {
      return ` aplicando ${conditionCount} filtros`
    }
  }

  /**
   * Constrói uma descrição simples dos dados retornados
   */
  private buildDataDescription(result: QueryResult): string {
    if (!result.rows || result.rows.length === 0 || !result.columns) {
      return ''
    }

    // Pegar apenas a primeira linha como exemplo
    const firstRow = result.rows[0]
    const columns = result.columns

    // Mostrar apenas os valores mais relevantes (primeiras 3 colunas ou valores numéricos)
    const relevantData = columns.slice(0, 3).map((_, index) => {
      const value = firstRow[index]
      if (value !== null && value !== undefined) {
        return String(value).substring(0, 30)
      }
      return null
    }).filter(v => v !== null)

    if (relevantData.length > 0) {
      return `DADOS EXEMPLO: ${relevantData.join(', ')}`
    }

    return ''
  }

  /**
   * Constrói as mensagens da conversa incluindo apenas o histórico simples
   */
  private buildConversationMessages(currentPrompt: string, conversationHistory: any[]): any[] {
    const messages: any[] = []

    // Adicionar mensagens do histórico (limitado às últimas 6 mensagens para não sobrecarregar)
    const recentHistory = conversationHistory.slice(-6)

    for (const msg of recentHistory) {
      if (msg.tipo === 'user') {
        messages.push({
          role: 'user',
          content: msg.conteudo
        })
      } else if (msg.tipo === 'assistant') {
        // Para mensagens do assistente, incluir o conteúdo principal
        let assistantContent = ''

        if (msg.conteudo && msg.conteudo.trim()) {
          // Se é uma resposta conversacional
          assistantContent = msg.conteudo
        } else if (msg.sqlQuery) {
          // Se é uma resposta SQL, criar uma resposta contextual
          assistantContent = `Gerei esta consulta SQL: ${msg.sqlQuery}`

          // Adicionar informações sobre os resultados se disponível
          if (msg.queryResult && msg.queryResult.success !== false) {
            if (msg.queryResult.rowCount !== undefined) {
              assistantContent += `\n\nA consulta retornou ${msg.queryResult.rowCount} resultado${msg.queryResult.rowCount !== 1 ? 's' : ''}.`
            }
          } else if (msg.queryResult && msg.queryResult.success === false) {
            assistantContent += `\n\nHouve um erro na execução: ${msg.queryResult.error}`
          }
        }

        if (assistantContent.trim()) {
          messages.push({
            role: 'assistant',
            content: assistantContent
          })
        }
      }
    }

    // Adicionar a mensagem atual do usuário
    messages.push({
      role: 'user',
      content: currentPrompt
    })

    return messages
  }

  /**
   * Gera um título para a conversa baseado nas mensagens do usuário usando Groq
   */
  async generateConversationTitle(userMessages: Array<{ conteudo: string }>): Promise<string | null> {
    try {
      console.log('🤖 Gerando título automático usando LLMService...')

      if (userMessages.length === 0) {
        console.log('⚠️ Nenhuma mensagem do usuário fornecida para gerar título')
        return null
      }

      // Construir contexto das mensagens para o prompt
      const messagesContext = userMessages
        .map((msg, index) => `${index + 1}. ${msg.conteudo}`)
        .join('\n')

      const titlePrompt = `
Baseado nas seguintes mensagens de uma conversa sobre consultas SQL e dados educacionais, gere um título conciso e descritivo para a conversa.

Mensagens do usuário:
${messagesContext}

Regras para o título:
- Máximo 50 caracteres
- Seja específico sobre o tema principal
- Use linguagem clara e direta
- Foque no assunto principal da consulta
- Não use aspas ou caracteres especiais
- Exemplos: Universidades por Estado, Análise de Cursos EAD, Dados de Matrículas 2023

Título:`

      // Usar sistema de fallback para gerar o título
      const response = await this.handlePrompt({
        prompt: titlePrompt,
        model: 'llama-3.1-8b-instant' // Modelo rápido para títulos
      })

      const generatedTitle = response.success && response.content ? response.content.trim() : null

      if (generatedTitle && generatedTitle.length > 0) {
        // Remover aspas do início e fim se existirem
        let cleanTitle = generatedTitle
        if ((cleanTitle.startsWith('"') && cleanTitle.endsWith('"')) ||
          (cleanTitle.startsWith("'") && cleanTitle.endsWith("'"))) {
          cleanTitle = cleanTitle.slice(1, -1).trim()
        }

        // Limitar o título a 50 caracteres
        const finalTitle = cleanTitle.length > 50
          ? cleanTitle.substring(0, 47) + '...'
          : cleanTitle

        console.log('✅ Título automático gerado pelo LLMService:', finalTitle)
        return finalTitle
      } else {
        console.log('⚠️ Não foi possível gerar título automático')
        return null
      }

    } catch (error) {
      console.error('❌ Erro ao gerar título automático no LLMService:', error)
      return null
    }
  }
}
