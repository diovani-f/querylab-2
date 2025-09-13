import axios from 'axios'
import { LLMService } from './llm-service'

export interface CloudflareAIRequest {
  prompt: string
  schema?: string
  temperature?: number
  max_tokens?: number
}

export interface CloudflareAIResponse {
  success: boolean
  result?: string
  error?: string
  processingTime: number
}

export class CloudflareAIService {
  private static instance: CloudflareAIService
  private apiToken: string
  private accountId: string
  private baseUrl: string
  private llmService: LLMService

  private constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN!
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID!
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`
    this.llmService = LLMService.getInstance()

    if (!this.apiToken) {
      throw new Error('CLOUDFLARE_API_TOKEN é obrigatória! Verifique o arquivo .env')
    }

    if (!this.accountId) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID é obrigatória! Verifique o arquivo .env')
    }
  }

  static getInstance(): CloudflareAIService {
    if (!CloudflareAIService.instance) {
      CloudflareAIService.instance = new CloudflareAIService()
    }
    return CloudflareAIService.instance
  }

  /**
   * Chama uma IA rápida para reduzir o schema baseado na pergunta
   */
  async reduceSchema(question: string, fullSchema: string): Promise<{
    success: boolean
    reducedSchema?: string
    error?: string
  }> {
    try {
      const prompt = `
Você é um especialista em bancos de dados educacionais do INEP. Analise a pergunta sobre dados educacionais e identifique apenas as tabelas e colunas relevantes do schema.

PERGUNTA: ${question}

SCHEMA COMPLETO (DADOS EDUCACIONAIS):
${fullSchema}

INSTRUÇÕES:
- Retorne APENAS as tabelas e colunas necessárias para responder a pergunta
- Mantenha o formato JSON original do schema
- SEMPRE inclua chaves primárias e estrangeiras das tabelas selecionadas
- Para dados educacionais, considere relacionamentos entre instituições, cursos, estudantes
- Seja preciso: inclua apenas o essencial, mas não omita dependências importantes
- Se a pergunta menciona anos/períodos, inclua colunas de data relevantes

SCHEMA REDUZIDO:
`

      // Usar LLMService centralizado para reduzir o schema
      const llmResponse = await this.llmService.handlePrompt({
        prompt,
        model: 'llama-3.3-70b-versatile'
      })

      if (!llmResponse.success) {
        return {
          success: false,
          error: `Erro do LLM: ${llmResponse.error}`
        }
      }

      const reducedSchema = llmResponse.content?.trim()

      if (!reducedSchema) {
        return {
          success: false,
          error: 'Não foi possível reduzir o schema'
        }
      }

      return {
        success: true,
        reducedSchema
      }

    } catch (error) {
      console.error('❌ Erro ao reduzir schema:', error)

      // Fallback: retornar schema original se a redução falhar
      console.log('⚠️ Usando schema completo como fallback')
      return {
        success: true,
        reducedSchema: fullSchema // Usar schema completo como fallback
      }
    }
  }

  /**
   * Chama o modelo sqlcoder-7b-2 no Cloudflare Workers AI
   */
  async generateSQL(request: CloudflareAIRequest): Promise<CloudflareAIResponse> {
    const startTime = Date.now()

    try {
      const response = await axios.post(
        `${this.baseUrl}/@cf/defog/sqlcoder-7b-2`,
        {
          prompt: request.prompt,
          temperature: request.temperature || 0.1,
          max_tokens: request.max_tokens || 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const processingTime = Date.now() - startTime

      if (response.data.success) {
        return {
          success: true,
          result: response.data.result.response,
          processingTime
        }
      } else {
        return {
          success: false,
          error: response.data.errors?.[0]?.message || 'Erro desconhecido do Cloudflare',
          processingTime
        }
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error('❌ Erro ao chamar Cloudflare AI:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        processingTime
      }
    }
  }

  /**
   * Processa uma pergunta SQL completa: reduz schema + gera SQL
   * NOTA: Esta é uma função auxiliar que APENAS gera SQL.
   * A função principal completa está em ChatService.processSQLQuery()
   *
   * USADA POR: ChatService.processSQLQuery() quando selectedModel é 'cloudflare-sqlcoder-7b-2'
   */
  async processSQL(question: string, fullSchema: string): Promise<{
    success: boolean
    sql?: string
    reducedSchema?: string
    error?: string
    processingTime: number
  }> {
    const startTime = Date.now()

    try {
      // Primeiro, reduzir o schema
      const schemaReduction = await this.reduceSchema(question, fullSchema)

      if (!schemaReduction.success) {
        return {
          success: false,
          error: `Erro ao reduzir schema: ${schemaReduction.error}`,
          processingTime: Date.now() - startTime
        }
      }

      // Construir prompt para o sqlcoder
      const prompt = `
### Task
Generate a SQL query to answer this question: ${question}

### Database Schema
${schemaReduction.reducedSchema}

### Important Rules
- Return ONLY clean SQL code without semicolon at the end
- ALWAYS prefix table names with "inep." (e.g., inep.censo_cursos, inep.censo_modalidades_ensino)
- ALWAYS add LIMIT 100 to SELECT * queries to prevent database overload
- Use LIMIT 50 for complex queries with JOINs
- Optimize for performance and safety

### SQL Query
`

      // Chamar o Cloudflare AI
      const sqlResponse = await this.generateSQL({ prompt })

      if (!sqlResponse.success) {
        return {
          success: false,
          error: `Erro ao gerar SQL: ${sqlResponse.error}`,
          processingTime: Date.now() - startTime
        }
      }

      // Extrair SQL da resposta
      const sql = this.extractSQL(sqlResponse.result || '')

      return {
        success: true,
        sql,
        reducedSchema: schemaReduction.reducedSchema,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Extrai SQL da resposta do modelo (método público)
   */
  public extractSQL(response: string): string {
    console.log('🔍 Extraindo SQL da resposta:', response)

    // Procurar por blocos SQL
    const sqlBlockMatch = response.match(/```sql\s*([\s\S]*?)\s*```/i)
    if (sqlBlockMatch) {
      const extracted = sqlBlockMatch[1].trim()
      console.log('✅ SQL extraído de bloco:', extracted)
      return extracted
    }

    // Procurar por SELECT, INSERT, UPDATE, DELETE no início de linhas (multiline)
    const sqlMatch = response.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*$/im)
    if (sqlMatch) {
      const extracted = sqlMatch[0].trim()
      console.log('✅ SQL extraído por regex:', extracted)
      return extracted
    }

    // Procurar por SQL em qualquer lugar da resposta (mais flexível)
    const flexibleSqlMatch = response.match(/(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i)
    if (flexibleSqlMatch) {
      const extracted = flexibleSqlMatch[0].trim()
      console.log('✅ SQL extraído flexível:', extracted)
      return extracted
    }

    // Fallback: retornar a resposta limpa
    console.log('⚠️ Usando fallback - resposta completa:', response.trim())
    return response.trim()
  }
}
