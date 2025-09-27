import axios from 'axios'
import { LLMService } from './llm-service'
import { GeminiService } from './gemini-service'

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
  private geminiService: GeminiService

  private constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN!
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID!
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`
    this.llmService = LLMService.getInstance()
    this.geminiService = GeminiService.getInstance()

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
   * Reduz schema de forma inteligente usando Gemini AI
   * Envia o schema completo para o Gemini e pede uma versão reduzida otimizada para Cloudflare
   */
  async reduceSchema(question: string, fullSchema: string): Promise<{
    success: boolean
    reducedSchema?: string
    error?: string
    reasoning?: string
  }> {
    try {
      console.log('� Usando Gemini AI para redução inteligente de schema...')

      // Calcular tamanho do schema original
      const originalSize = fullSchema.length
      console.log('📏 Tamanho do schema original:', originalSize, 'bytes')

      // Criar prompt para o Gemini reduzir o schema
      const prompt = `
Você é um especialista em bancos de dados educacionais do INEP. Analise o schema completo e retorne uma versão reduzida otimizada para a pergunta específica.

PERGUNTA: ${question}

SCHEMA COMPLETO:
${fullSchema}

INSTRUÇÕES:
1. Identifique as 4-6 tabelas mais relevantes para responder a pergunta
2. Para cada tabela selecionada, mantenha:
   - name, type, description, category
   - keyColumns (máximo 3-4 colunas principais)
   - importantColumns (máximo 4-5 colunas relevantes)
   - columnCount, estimatedRows
3. Mantenha o formato JSON exato do schema original
4. O resultado deve ter no máximo 12KB
5. Priorize tabelas com dados diretamente relacionados à pergunta
6. Inclua colunas temporais se a pergunta menciona anos/períodos
7. Inclua dados geográficos se a pergunta menciona localização

IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional, comentários ou formatação markdown.

Exemplo de estrutura esperada:
{
  "schemaName": "inep",
  "totalTables": 4,
  "tables": [
    {
      "name": "nome_tabela",
      "type": "table",
      "description": "descrição",
      "category": "categoria",
      "keyColumns": [...],
      "importantColumns": [...],
      "columnCount": 10,
      "estimatedRows": 1000
    }
  ]
}
`

      // Fazer requisição para o Gemini
      const geminiResponse = await this.geminiService.generateResponse({
        prompt,
        model: 'gemini-2.5-flash-lite',
        context: {
          conversationHistory: []
        }
      })

      if (!geminiResponse.success) {
        console.log('⚠️ Gemini falhou, usando fallback...')
        return await this.fallbackLLMReduction(question, fullSchema)
      }

      // Extrair e validar o JSON do schema reduzido
      let reducedSchema: string
      try {
        const content = geminiResponse.content?.trim() || ''
        console.log('🔍 Resposta bruta do Gemini (primeiros 500 chars):', content.substring(0, 500))

        // Remover possíveis blocos de código markdown
        let cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '')

        // Tentar extrair JSON da resposta (buscar pelo primeiro { até o último })
        const firstBrace = cleanContent.indexOf('{')
        const lastBrace = cleanContent.lastIndexOf('}')

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const extractedJson = cleanContent.substring(firstBrace, lastBrace + 1)

          // Validar se é JSON válido
          const parsedSchema = JSON.parse(extractedJson)

          // Verificar se tem a estrutura esperada
          if (parsedSchema.tables && Array.isArray(parsedSchema.tables)) {
            reducedSchema = JSON.stringify(parsedSchema, null, 2)
            console.log('✅ JSON extraído e validado com sucesso')
          } else {
            throw new Error('Estrutura de schema inválida')
          }
        } else {
          throw new Error('JSON não encontrado na resposta')
        }
      } catch (parseError) {
        console.log('⚠️ Erro ao parsear resposta do Gemini:', parseError)
        console.log('⚠️ Usando fallback...')
        return await this.fallbackLLMReduction(question, fullSchema)
      }

      // Verificar tamanho do schema reduzido
      const reducedSize = reducedSchema.length
      console.log('� Tamanho do schema reduzido pelo Gemini:', reducedSize, 'bytes')

      // Se ainda estiver muito grande, aplicar truncamento adicional
      if (reducedSize > 15000) {
        console.log('⚠️ Schema ainda muito grande, aplicando truncamento adicional...')
        reducedSchema = this.truncateSchemaForCloudflare(reducedSchema)
      }

      const finalSize = reducedSchema.length
      const reductionRatio = ((originalSize - finalSize) / originalSize * 100).toFixed(1)

      console.log('✅ Schema reduzido pelo Gemini:', {
        tamanhoOriginal: originalSize,
        tamanhoFinal: finalSize,
        reducao: `${reductionRatio}%`,
        modelo: geminiResponse.model
      })

      return {
        success: true,
        reducedSchema,
        reasoning: `Schema reduzido pelo Gemini (${geminiResponse.model}) com ${reductionRatio}% de redução`
      }

    } catch (error) {
      console.error('❌ Erro na redução com Gemini:', error)

      // Fallback para método LLM tradicional
      console.log('⚠️ Usando fallback LLM devido a erro...')
      return await this.fallbackLLMReduction(question, fullSchema)
    }
  }

  /**
   * Método de fallback usando LLM para redução de schema
   */
  public async fallbackLLMReduction(question: string, fullSchema: string): Promise<{
    success: boolean
    reducedSchema?: string
    error?: string
  }> {
    try {
      const prompt = `
Você é um especialista em bancos de dados educacionais do INEP. Analise a pergunta e identifique apenas as tabelas mais relevantes do schema.

PERGUNTA: ${question}

SCHEMA COMPLETO (PRIMEIRAS 50 TABELAS):
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

      const llmResponse = await this.llmService.handlePrompt({
        prompt,
        model: 'gemini-2.5-flash-lite'
      })

      if (!llmResponse.success) {
        // Último fallback: usar schema original truncado
        console.log('⚠️ LLM fallback falhou, usando schema truncado...')
        return {
          success: true,
          reducedSchema: this.truncateSchemaForLLM(fullSchema)
        }
      }

      return {
        success: true,
        reducedSchema: llmResponse.content?.trim() || this.truncateSchemaForLLM(fullSchema)
      }

    } catch (error) {
      console.error('❌ Erro no fallback LLM:', error)

      // Último recurso: schema truncado
      return {
        success: true,
        reducedSchema: this.truncateSchemaForLLM(fullSchema)
      }
    }
  }

  /**
   * Trunca schema para caber no contexto do LLM
   */
  private truncateSchemaForLLM(fullSchema: string): string {
    try {
      const schema = JSON.parse(fullSchema)
      if (schema.tables && schema.tables.length > 30) {
        // Manter apenas as primeiras 30 tabelas mais importantes
        const truncatedSchema = {
          ...schema,
          tables: schema.tables.slice(0, 30),
          note: 'Schema truncado para otimização'
        }
        return JSON.stringify(truncatedSchema, null, 2)
      }
      return fullSchema
    } catch {
      // Se não conseguir parsear, truncar por tamanho
      return fullSchema.length > 50000 ? fullSchema.substring(0, 50000) + '...' : fullSchema
    }
  }

  /**
   * Trunca schema especificamente para Cloudflare AI (limites mais restritivos)
   */
  private truncateSchemaForCloudflare(schema: string): string {
    try {
      const parsedSchema = JSON.parse(schema)

      if (parsedSchema.tables && parsedSchema.tables.length > 0) {
        // Para Cloudflare, usar apenas as 3-4 tabelas mais relevantes
        const limitedTables = parsedSchema.tables.slice(0, 4).map((table: any) => ({
          name: table.name,
          type: table.type,
          description: table.description,
          // Manter apenas as colunas mais importantes (máximo 10 por tabela)
          keyColumns: table.keyColumns?.slice(0, 5) || [],
          importantColumns: table.importantColumns?.slice(0, 5) || [],
          // Remover dados extras para economizar espaço
          columnCount: table.columnCount,
          category: table.category
        }))

        const compactSchema = {
          schemaName: parsedSchema.schemaName,
          totalTables: limitedTables.length,
          tables: limitedTables,
          note: 'Schema compactado para Cloudflare AI'
        }

        return JSON.stringify(compactSchema)
      }

      return schema
    } catch (error) {
      console.error('❌ Erro ao truncar schema para Cloudflare:', error)
      // Fallback: truncar string drasticamente
      return schema.substring(0, 5000)
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
