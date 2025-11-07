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
   * Usa Gemini para criar um prompt otimizado para SQLCoder
   * Analisa a pergunta, identifica tabelas relevantes e gera schema mínimo + instruções precisas
   */
  async optimizePromptForSQLCoder(question: string, fullSchema: string): Promise<{
    success: boolean
    optimizedPrompt?: string
    error?: string
    reasoning?: string
  }> {
    try {
      console.log('🧠 Usando Gemini para otimizar prompt para SQLCoder...')

      const geminiPrompt = `
Você é um especialista em otimização de prompts para modelos SQL especializados.

TAREFA: Analise a pergunta do usuário e crie um prompt ULTRA-COMPACTO para o modelo SQLCoder-7B.

PERGUNTA DO USUÁRIO: ${question}

SCHEMA COMPLETO DISPONÍVEL:
${fullSchema}

INSTRUÇÕES:
1. Identifique APENAS as 1-3 tabelas essenciais para responder a pergunta
2. Para cada tabela, liste APENAS as colunas que serão usadas (máximo 5-8 colunas por tabela)
3. **CRÍTICO**: Use EXATAMENTE os nomes de colunas do schema fornecido - NÃO invente, NÃO abrevie, NÃO modifique
4. Inclua AVISOS EXPLÍCITOS sobre colunas que NÃO existem mas que o modelo pode tentar usar
5. Gere um exemplo de SQL correto similar à pergunta usando os nomes EXATOS das colunas

REGRAS CRÍTICAS SOBRE NOMES DE COLUNAS (USE EXATAMENTE ESTES NOMES):
- emec_instituicoes: co_ies (INT), no_ies (TEXT), no_municipio (TEXT), sg_uf (CHAR)
- censo_cursos: cod_curso (INT), nome_curso (VARCHAR), cod_ies (INT), cod_municipio (CHAR)
- municipios_ibge: cod_ibge (CHAR), nome_municipio (VARCHAR)
- uf_ibge: uf_ibge (CHAR PK), nome_uf_ibge (VARCHAR), cod_regiao_ibge (INT)

COLUNAS QUE NÃO EXISTEM (NÃO USE):
- ❌ emec_instituicoes.co_municipio (use no_municipio)
- ❌ censo_cursos.co_ies (use cod_ies)
- ❌ censo_cursos.no_curso (use nome_curso)
- ❌ censo_cursos.co_curso (use cod_curso)
- ❌ municipios_ibge.no_municipio (use nome_municipio)

JOINS CORRETOS:
- emec_instituicoes.co_ies = censo_cursos.cod_ies
- emec_instituicoes.sg_uf = uf_ibge.uf_ibge
- NUNCA faça JOIN entre emec_instituicoes e municipios_ibge (não há coluna comum!)

FORMATO DE SAÍDA (seja EXTREMAMENTE conciso):
---
### Task
Generate SQL for: [reformule a pergunta em inglês, 1 linha]

### Schema (only relevant tables)
inep.emec_instituicoes: co_ies:int, no_ies:text, no_municipio:text, sg_uf:char
inep.censo_cursos: cod_curso:int, nome_curso:varchar, cod_ies:int

### Critical Rules
- USE EXACTLY: cod_ies (NOT co_ies), nome_curso (NOT no_curso), cod_curso (NOT co_curso)
- JOIN: emec_instituicoes.co_ies = censo_cursos.cod_ies
- For city search: WHERE no_municipio ILIKE '%city%'
- NEVER use: co_municipio, no_curso, co_curso

### Example
SELECT COUNT(DISTINCT c.cod_curso)
FROM inep.censo_cursos c
JOIN inep.emec_instituicoes e ON c.cod_ies = e.co_ies
WHERE e.sg_uf = 'SP' AND c.nome_curso ILIKE '%Administração%'
LIMIT 100

### SQL Query
---

Retorne APENAS o conteúdo entre as linhas ---, sem explicações adicionais.
`

      const result = await this.geminiService.generateResponse({
        prompt: geminiPrompt,
        model: 'gemini-2.5-flash-lite',
        context: { conversationHistory: [] }
      })

      if (!result.success) {
        console.log('⚠️ Gemini falhou na otimização, usando fallback...')
        return this.fallbackOptimization(question, fullSchema)
      }

      const optimizedPrompt = result.content?.trim() || ''

      console.log('✅ Prompt otimizado gerado pelo Gemini')
      console.log('📏 Tamanho do prompt otimizado:', optimizedPrompt.length, 'bytes')
      console.log('📊 Redução:', Math.round((1 - optimizedPrompt.length / fullSchema.length) * 100), '%')

      return {
        success: true,
        optimizedPrompt,
        reasoning: `Prompt otimizado pelo Gemini (${result.model}) com ${Math.round((1 - optimizedPrompt.length / fullSchema.length) * 100)}% de redução`
      }

    } catch (error) {
      console.error('❌ Erro na otimização com Gemini:', error)
      return this.fallbackOptimization(question, fullSchema)
    }
  }

  /**
   * Fallback: cria prompt otimizado manualmente
   */
  private fallbackOptimization(question: string, fullSchema: string): {
    success: boolean
    optimizedPrompt?: string
    error?: string
  } {
    console.log('⚠️ Usando otimização manual de fallback...')

    // Criar versão ultra-compacta do schema
    const compactSchema = this.truncateSchemaForLLM(fullSchema)

    const optimizedPrompt = `
### Task
Generate SQL for: ${question}

### Schema
${compactSchema}

### Critical Rules
- USE EXACTLY: cod_ies (NOT co_ies), nome_curso (NOT no_curso), cod_curso (NOT co_curso)
- emec_instituicoes: co_ies, no_ies, no_municipio, sg_uf
- censo_cursos: cod_curso, nome_curso, cod_ies
- municipios_ibge: cod_ibge, nome_municipio
- JOIN: emec_instituicoes.co_ies = censo_cursos.cod_ies
- For city search: WHERE no_municipio ILIKE '%city%'
- NEVER use: co_municipio, no_curso, co_curso, no_municipio in municipios_ibge
- NEVER JOIN emec_instituicoes with municipios_ibge (no common column!)

### Example
SELECT COUNT(DISTINCT c.cod_curso)
FROM inep.censo_cursos c
JOIN inep.emec_instituicoes e ON c.cod_ies = e.co_ies
WHERE e.sg_uf = 'SP' AND c.nome_curso ILIKE '%Administração%'
LIMIT 100

### SQL Query
`

    return {
      success: true,
      optimizedPrompt
    }
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
      // Usar Gemini para otimizar o prompt especificamente para SQLCoder
      console.log('🎯 Otimizando prompt para SQLCoder com Gemini...')
      const optimization = await this.optimizePromptForSQLCoder(question, fullSchema)

      if (!optimization.success) {
        return {
          success: false,
          error: `Erro ao otimizar prompt: ${optimization.error}`,
          processingTime: Date.now() - startTime
        }
      }

      // Usar o prompt otimizado pelo Gemini
      const prompt = optimization.optimizedPrompt!

      console.log('📝 Prompt otimizado para SQLCoder:', prompt.substring(0, 200) + '...')

      // Chamar o Cloudflare AI com o prompt otimizado
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
        reducedSchema: optimization.optimizedPrompt,
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

    let extracted = ''

    // Procurar por blocos SQL
    const sqlBlockMatch = response.match(/```sql\s*([\s\S]*?)\s*```/i)
    if (sqlBlockMatch) {
      extracted = sqlBlockMatch[1].trim()
      console.log('✅ SQL extraído de bloco:', extracted)
    }
    // Procurar por SELECT, INSERT, UPDATE, DELETE no início de linhas (multiline)
    else {
      const sqlMatch = response.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*$/im)
      if (sqlMatch) {
        extracted = sqlMatch[0].trim()
        console.log('✅ SQL extraído por regex:', extracted)
      }
      // Procurar por SQL em qualquer lugar da resposta (mais flexível)
      else {
        const flexibleSqlMatch = response.match(/(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i)
        if (flexibleSqlMatch) {
          extracted = flexibleSqlMatch[0].trim()
          console.log('✅ SQL extraído flexível:', extracted)
        } else {
          console.log('⚠️ Usando fallback - resposta completa:', response.trim())
          extracted = response.trim()
        }
      }
    }

    // Limpar o SQL: remover ponto e vírgula antes de LIMIT, ORDER BY, etc.
    extracted = extracted
      .replace(/;\s*(LIMIT|ORDER BY|GROUP BY|HAVING)/gi, ' $1')  // Remove ; antes de cláusulas
      .replace(/;\s*$/, '')  // Remove ; no final
      .trim()

    console.log('🧹 SQL limpo:', extracted)
    return extracted
  }
}
