import Groq from 'groq-sdk'
import axios from 'axios'
import { LLMRequest, LLMResponse } from '../types'
import { SchemaDiscoveryService } from './schema-discovery-service'
import { PrismaClient, LLMModel } from '@prisma/client'

export class LLMService {
  private prisma: PrismaClient
  private static instance: LLMService
  private groqClient: Groq
  private availableModels: LLMModel[] = []
  private schemaService: SchemaDiscoveryService

  private constructor() {
    this.prisma = new PrismaClient()

    // Verificar se a API key está disponível
    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY é obrigatória! Verifique o arquivo .env')
    }

    // Inicializar cliente Groq
    this.groqClient = new Groq({
      apiKey: groqApiKey
    })

    // Inicializar serviço de schema discovery
    this.schemaService = SchemaDiscoveryService.getInstance()
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
    return this.availableModels
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
   * Determina se o prompt é conversacional ou uma consulta de dados.
   * Gera uma explicação ou um SQL baseado na intenção.
   */
  async handlePrompt(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, model, context } = request
    try {
      const systemPrompt = await this.buildSystemPrompt(context)
      const userPrompt = this.buildUserPrompt(prompt)

      // Se for o modelo sqlcoder-7b-2, chama o endpoint Python via axios
      if (model === 'sqlcoder-7b-2') {
        const response = await axios.post(`${process.env.NGROK_MODEL_URL}/generate_sql`, {
          system_prompt: systemPrompt,
          user_prompt: userPrompt
        })
        const data = response.data
        const explanation = data.explanation || await this.generateQueryExplanation({
          prompt,
          sql: data.sql
        })
        return {
          success: true,
          sqlQuery: data.sql,
          explanation: explanation,
          model,
          tokensUsed: 0,
          processingTime: Date.now()
        }
      }

      // Modelos padrão (Groq)
      const completion = await this.groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model,
        temperature: 0.1,
        max_tokens: 1000,
        top_p: 1,
        stream: false
      })
      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('Resposta vazia do modelo LLM')
      }

      // Se for uma CONVERSA retorna sem explicação simples da query
      if (response.trim().startsWith('CONVERSA:')) {
        return {
          success: true,
          content: response.trim().replace('CONVERSA:', ''),
          model,
          tokensUsed: completion.usage?.total_tokens || 0,
          processingTime: Date.now()
        }
      }

      const sqlQuery = this.extractSQL(response)

      // Busca explicação simples da query
      const explanation = await this.generateQueryExplanation({
        prompt,
        sql: sqlQuery
      })

      // Se a resposta for um SQL, retorna o SQL e a explicação da query
      return {
        success: true,
        content: "",
        sqlQuery,
        explanation,
        model,
        tokensUsed: completion.usage?.total_tokens || 0,
        processingTime: Date.now()
      }
    } catch (error) {
      console.error('❌ Erro ao processar prompt:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        model: model,
        tokensUsed: 0,
        processingTime: Date.now()
      }
    }
  }

  /**
   * Gera uma explicação sucinta e amigável da consulta SQL para o usuário leigo.
   */
  public async generateQueryExplanation(params: {
    prompt: string
    sql: string
  }): Promise<string> {
    const { prompt, sql } = params
    if (!sql) return ''
    const explanationPrompt = `Gere uma explicação curta e amigável, em uma única frase, para a seguinte consulta SQL. Diga ao usuário o que a consulta irá buscar, sem usar termos técnicos ou repetir o SQL.

    Pergunta original: "${prompt}"

    Consulta SQL: ${sql}

    Explicação amigável:`
    try {
      const completion = await this.groqClient.chat.completions.create({
        messages: [{ role: 'user', content: explanationPrompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,
        max_tokens: 200
      })
      const explanation = completion.choices[0]?.message?.content?.trim()
      return explanation || ''
    } catch (error) {
      console.error('❌ Erro ao gerar explicação da query:', error)
      return 'Não foi possível gerar uma explicação para a consulta.'
    }
  }

  /**
   * Gera uma explicação detalhada e técnica dos resultados de uma consulta.
   */
  async generateDetailedResultExplanation(params: {
    query: string
    result: any
    originalPrompt: string
  }): Promise<{ success: boolean; explanation?: string; error?: string }> {
    try {
      const { query, result, originalPrompt } = params
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

      const response = await this.groqClient.chat.completions.create({
        messages: [{ role: 'user', content: explanationPrompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1000
      })

      const explanation = response.choices[0]?.message?.content?.trim()
      if (!explanation) {
        return { success: false, error: 'Não foi possível gerar explicação detalhada' }
      }
      return { success: true, explanation }
    } catch (error) {
      console.error('❌ Erro ao gerar explicação detalhada:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  }

  // O restante dos métodos (buildSystemPrompt, buildUserPrompt, extractSQL, etc.)
  // permanecem os mesmos, pois já estão bem implementados para a sua arquitetura.
  public async buildSystemPrompt(context?: any): Promise<string> {
    const schemaInfo = await this.schemaService.getSchemaForLLM(context?.schemaName || 'inep');
    const basePrompt = `Você é um assistente especializado em consultas SQL para banco de dados DB2, mas também pode conversar normalmente com o usuário.

REGRAS IMPORTANTES:
1. Se a mensagem for uma saudação (oi, olá, hello, etc.) ou pergunta geral sobre o que você faz, responda SEMPRE com "CONVERSA:" seguido da explicação. Mantenha a conversa natural e amigável.
2. Se for uma consulta específica sobre dados (quantas, liste, mostre, etc.), gere APENAS o SQL válido.
3. NUNCA misture explicação com SQL.
4. Use SEMPRE nomes de tabelas e colunas EXATOS como mostrados no schema.
5. Para DB2, use sintaxe específica: FETCH FIRST n ROWS ONLY ao invés de LIMIT.
6. Sempre prefixe o nome da tabela com o schema inep (ex: inep.CENSO_IES).
7. Se o schema não estiver disponível, avise o usuário e gere consultas genéricas.
8. Mantenha a conversa fluida e educada quando não for uma consulta SQL.

SCHEMA DO BANCO DE DADOS:`;
    if (schemaInfo && schemaInfo.tables && schemaInfo.tables.length > 0) {
      const schemaDescription = schemaInfo.tables.map((table: any) => {
        const keyColumns = table.keyColumns?.map((col: any) => `${col.name} (${col.dataType})${col.nullable ? ' NULL' : ' NOT NULL'}`).join(', ') || '';
        const importantColumns = table.importantColumns?.map((col: any) => `${col.name} (${col.dataType})${col.nullable ? ' NULL' : ' NOT NULL'}`).join(', ') || '';
        return `- ${table.name}: ${table.columnCount} colunas
  Chaves: ${keyColumns}
  Colunas importantes: ${importantColumns}
  Tipo: ${table.type}${table.comment ? ` - ${table.comment}` : ''}`;
      }).join('\n');
      return `${basePrompt}
${schemaDescription}

RELACIONAMENTOS IDENTIFICADOS:
${schemaInfo.relationships?.map((rel: any) => `- ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable} (${rel.type})`).join('\n') || 'Nenhum relacionamento identificado'}

EXEMPLOS CORRETOS:

Entrada: "oi"
Saída: CONVERSA: Olá! Sou um assistente especializado em consultas SQL para dados do inep. Posso ajudar você a encontrar informações sobre instituições de ensino, cursos, avaliações e indicadores educacionais. Exemplos: "Quantas instituições existem?", "Liste os cursos de uma área específica", "Mostre dados de avaliação".

Entrada: "Quantas instituições existem?"
Saída: SELECT COUNT(*) as total FROM ${context?.schemaName || 'inep'}.${schemaInfo.tables[0]?.name || 'TABELA'};

Entrada: "Liste 10 cursos"
Saída: SELECT SOME_COLUMN_NAME FROM ${context?.schemaName || 'inep'}.${schemaInfo.tables[0]?.name || 'TABELA'} FETCH FIRST 10 ROWS ONLY;

Entrada: "o que você faz?"
Saída: CONVERSA: Sou especializado em converter suas perguntas em consultas SQL para buscar dados educacionais do inep. Posso ajudar com informações sobre instituições, cursos, avaliações e indicadores.

Entrada: "Me conte mais sobre você"
Saída: CONVERSA: Sou um assistente virtual focado em ajudar com consultas SQL e também posso conversar normalmente para tirar dúvidas ou explicar como funciono.
`;
    }
    // Fallback para schema básico se não conseguir carregar
    return `${basePrompt}
- Schema não disponível no momento. Use consultas genéricas.

EXEMPLOS CORRETOS:

Entrada: "oi"
Saída: CONVERSA: Olá! Sou um assistente especializado em consultas SQL. No momento, o schema detalhado não está disponível, mas posso ajudar com consultas básicas.

Entrada: "o que você faz?"
Saída: CONVERSA: Sou especializado em converter suas perguntas em consultas SQL. No momento, estou com acesso limitado ao schema do banco.
`;
  }

  public buildUserPrompt(prompt: string): string {
    return `Converta esta consulta em linguagem natural para SQL:

"${prompt}"

Retorne apenas o SQL válido:`
  }

  private extractSQL(response: string): string {
    // Tentar extrair SQL de blocos de código
    const sqlBlockMatch = response.match(/```sql\n([\s\S]*?)\n```/)
    if (sqlBlockMatch) {
      return sqlBlockMatch[1].trim()
    }

    // Tentar extrair SQL de blocos genéricos
    const codeBlockMatch = response.match(/```\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // Se não encontrar blocos, procurar por SQL direto
    const lines = response.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.toUpperCase().startsWith('SELECT') ||
        trimmed.toUpperCase().startsWith('INSERT') ||
        trimmed.toUpperCase().startsWith('UPDATE') ||
        trimmed.toUpperCase().startsWith('DELETE')) {
        return trimmed
      }
    }

    // Fallback: retornar a resposta completa limpa
    return response.trim()
  }
}
