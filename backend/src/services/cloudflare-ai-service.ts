import axios from 'axios'

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

  private constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN!
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID!
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`

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
Você é um especialista em bancos de dados. Analise a pergunta do usuário e o schema completo fornecido.
Retorne APENAS as tabelas e colunas que são relevantes para responder a pergunta.

PERGUNTA: ${question}

SCHEMA COMPLETO:
${fullSchema}

INSTRUÇÕES:
- Retorne apenas as tabelas e colunas necessárias
- Mantenha o formato original do schema
- Inclua chaves primárias e estrangeiras relevantes
- Seja conciso mas não omita informações importantes

SCHEMA REDUZIDO:
`

      // Usar um modelo rápido do Groq para reduzir o schema
      const Groq = require('groq-sdk')
      const groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY
      })

      const completion = await groqClient.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.1-8b-instant', // Modelo rápido
        temperature: 0.1,
        max_tokens: 2000
      })

      const reducedSchema = completion.choices[0]?.message?.content?.trim()

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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
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
    // Procurar por blocos SQL
    const sqlBlockMatch = response.match(/```sql\s*([\s\S]*?)\s*```/i)
    if (sqlBlockMatch) {
      return sqlBlockMatch[1].trim()
    }

    // Procurar por SELECT, INSERT, UPDATE, DELETE no início de linhas
    const sqlMatch = response.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?;?\s*$/im)
    if (sqlMatch) {
      return sqlMatch[0].trim()
    }

    // Fallback: retornar a resposta limpa
    return response.trim()
  }
}
