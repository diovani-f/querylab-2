import { LLMService } from './llm-service'
import { CloudflareAIService } from './cloudflare-ai-service'
import { SchemaDiscoveryService } from './schema-discovery-service'
import { GroqService } from './groq-service'
import { OpenRouterService } from './openrouter-service'
import { QueryExecutionService } from './query-execution-service'
import { SmartSchemaReducer } from './smart-schema-reducer'
import { SchemaEmbeddingService } from './schema-embedding-service'

export interface SQLGenerationRequest {
  question: string
  model: string
  sessionId: string
  conversationHistory?: any[]
}

export interface SQLGenerationResult {
  success: boolean
  sql?: string
  explanation?: string
  reducedSchema?: string
  processingTime: number
  error?: string
  validationWarnings?: string[]
}

export interface ParallelSQLResult {
  provider: 'gemini' | 'groq' | 'deepseek'
  model: string
  success: boolean
  prompt?: string
  sql?: string
  explanation?: string
  processingTime: number
  error?: string
  validationWarnings?: string[]
  status: 'pending' | 'generating' | 'complete' | 'error'
  // Resultados da execução
  executionSuccess?: boolean
  executionTime?: number
  rowCount?: number
  data?: any[]
  executionError?: string
}

export interface ParallelSQLGenerationResult {
  success: boolean
  results: ParallelSQLResult[]
  reducedSchema?: string
  totalProcessingTime: number
  bestResult?: ParallelSQLResult
}

export interface SQLValidationResult {
  isValid: boolean
  sanitizedSQL?: string
  errors: string[]
  warnings: string[]
}

/**
 * Serviço unificado para geração de SQL
 * Centraliza toda a lógica de geração, validação e sanitização
 */
export class SQLGenerationService {
  private static instance: SQLGenerationService
  private llmService: LLMService
  private cloudflareAI: CloudflareAIService
  private schemaService: SchemaDiscoveryService
  private queryExecutionService: QueryExecutionService
  private schemaReducer: SmartSchemaReducer
  private groqService?: GroqService
  private openRouterService?: OpenRouterService

  private constructor() {
    this.llmService = LLMService.getInstance()
    this.cloudflareAI = CloudflareAIService.getInstance()
    this.schemaService = SchemaDiscoveryService.getInstance()
    this.queryExecutionService = QueryExecutionService.getInstance()
    this.schemaReducer = SmartSchemaReducer.getInstance()

    // Inicializar Groq para resumos (opcional)
    try {
      this.groqService = GroqService.getInstance()
      console.log('✅ Groq inicializado no SQLGenerationService')
    } catch (error) {
      console.warn('⚠️ Groq não disponível no SQLGenerationService - usando LLMService como fallback')
    }

    // Inicializar OpenRouter/DeepSeek (opcional)
    try {
      this.openRouterService = OpenRouterService.getInstance()
      console.log('✅ OpenRouter/DeepSeek inicializado no SQLGenerationService')
    } catch (error) {
      console.warn('⚠️ OpenRouter não disponível - provider DeepSeek desabilitado')
    }
  }

  static getInstance(): SQLGenerationService {
    if (!SQLGenerationService.instance) {
      SQLGenerationService.instance = new SQLGenerationService()
    }
    return SQLGenerationService.instance
  }

  /**
   * Método principal para geração de SQL unificada
   */
  async generateSQL(request: SQLGenerationRequest): Promise<SQLGenerationResult> {
    const startTime = Date.now()

    try {
      console.log(`🔧 Iniciando geração SQL unificada para modelo: ${request.model}`)

      // 1. Obter e reduzir schema
      const schemaResult = await this.getReducedSchema(request.question)
      if (!schemaResult.success) {
        return {
          success: false,
          error: `Erro ao obter schema: ${schemaResult.error}`,
          processingTime: Date.now() - startTime
        }
      }

      // 2. Gerar SQL baseado no modelo
      const sqlResult = await this.generateSQLByModel(
        request.question,
        request.model,
        schemaResult.reducedSchema!,
        request.conversationHistory
      )

      if (!sqlResult.success) {
        return {
          success: false,
          error: `Erro na geração SQL: ${sqlResult.error}`,
          processingTime: Date.now() - startTime
        }
      }

      // 3. Validar e sanitizar SQL
      const validationResult = await this.validateAndSanitizeSQL(sqlResult.sql!)
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `SQL inválido: ${validationResult.errors.join(', ')}`,
          processingTime: Date.now() - startTime
        }
      }

      return {
        success: true,
        sql: validationResult.sanitizedSQL!,
        explanation: sqlResult.explanation || '',
        reducedSchema: schemaResult.reducedSchema,
        processingTime: Date.now() - startTime,
        validationWarnings: validationResult.warnings
      }

    } catch (error) {
      console.error('❌ Erro na geração SQL unificada:', error)

      // Retornar erro original sem processamento
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Gera SQL em paralelo usando 3 modelos: Gemini, Groq e Cloudflare SQLCoder
   */
  async generateSQLParallel(request: SQLGenerationRequest): Promise<ParallelSQLGenerationResult> {
    const startTime = Date.now()

    try {
      console.log(`🚀 Iniciando geração SQL paralela para 3 modelos`)

      // 1. Obter e reduzir schema (uma vez para todos)
      const schemaResult = await this.getReducedSchema(request.question)
      if (!schemaResult.success) {
        return {
          success: false,
          results: [],
          totalProcessingTime: Date.now() - startTime
        }
      }

      const conversationContext = this.buildConversationContext(request.conversationHistory)

      // 2. Inicializar resultados
      const results: ParallelSQLResult[] = [
        {
          provider: 'gemini',
          model: 'gemini-2.5-flash-lite',
          success: false,
          status: 'pending',
          processingTime: 0
        },
        {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          success: false,
          status: 'pending',
          processingTime: 0
        },
        {
          provider: 'deepseek',
          model: 'deepseek-v3',
          success: false,
          status: 'pending',
          processingTime: 0
        }
      ]

      // 3. Gerar SQL em paralelo com Promise.allSettled
      const promises = [
        this.generateWithGemini(request.question, schemaResult.reducedSchema!, conversationContext),
        this.generateWithGroq(request.question, schemaResult.reducedSchema!, conversationContext),
        this.generateWithDeepSeek(request.question, schemaResult.reducedSchema!, conversationContext)
      ]

      const settledResults = await Promise.allSettled(promises)

      // 4. Processar resultados da geração
      for (let i = 0; i < settledResults.length; i++) {
        const settled = settledResults[i]

        if (settled.status === 'fulfilled' && settled.value.success) {
          console.log(`✅ Resultado ${i} (${results[i].provider}) bem-sucedido:`, settled.value)
          results[i] = {
            ...results[i],
            ...settled.value,
            status: 'complete'
          }
        } else {
          console.log(`❌ Resultado ${i} (${results[i].provider}) falhou:`, settled)
          results[i] = {
            ...results[i],
            status: 'error',
            error: settled.status === 'rejected'
              ? settled.reason?.message || 'Erro desconhecido'
              : settled.value.error || 'Falha na geração'
          }
        }
      }

      console.log('📊 Resultados após processamento:', results.map(r => ({
        provider: r.provider,
        success: r.success,
        status: r.status,
        hasSql: !!r.sql
      })))

      // 5. EXECUTAR automaticamente os SQLs que foram gerados com sucesso
      console.log('🔄 Executando SQLs gerados automaticamente...')
      const executionPromises = results.map(async (result) => {
        console.log(`🔍 Verificando ${result.provider}: success=${result.success}, hasSql=${!!result.sql}`)
        if (!result.success || !result.sql) {
          console.log(`⏭️ Pulando execução do ${result.provider}`)
          return result
        }

        const execStartTime = Date.now()
        try {
          console.log(`⚡ Executando SQL do ${result.provider}...`)
          const recommendedTimeout = this.queryExecutionService.getRecommendedTimeout(result.sql)
          let execResult = await this.queryExecutionService.executeWithTimeout(
            result.sql,
            { timeoutMs: recommendedTimeout } // Timeout dinâmico baseado na complexidade
          )

          // -------- AUTO-CORRECTION LOOP (2 rounds MAX) --------
          for (let round = 1; round <= 2 && !execResult.success && execResult.error && schemaResult.reducedSchema; round++) {
            console.log(`⚠️ Execução falhou para ${result.provider} (round ${round}). Tentando auto-correção... Erro: ${execResult.error}`)

            const correctionResult = await this.retrySQLGeneration(
              result.provider,
              result.model,
              request.question,
              result.sql!,
              execResult.error,
              schemaResult.reducedSchema,
              conversationContext
            )

            if (correctionResult.success && correctionResult.sql) {
              console.log(`✨ Auto-correção round ${round} bem sucedida para ${result.provider}! Re-executando...`)
              result.sql = correctionResult.sql
              result.prompt = (result.prompt || '') + `\n\n[Auto-Correção Round ${round} Aplicada]`

              const newTimeout = this.queryExecutionService.getRecommendedTimeout(result.sql)
              execResult = await this.queryExecutionService.executeWithTimeout(
                result.sql,
                { timeoutMs: newTimeout }
              )
            } else {
              console.log(`❌ Auto-correção round ${round} falhou para ${result.provider}.`)
              break
            }
          }
          // ---------------------------------------------------

          console.log(`✅ Execução do ${result.provider}:`, {
            success: execResult.success,
            rowCount: execResult.rowCount,
            hasRows: !!execResult.rows,
            rowsLength: execResult.rows?.length,
            hasColumns: !!execResult.columns,
            columnsLength: execResult.columns?.length,
            error: execResult.error
          })

          // Converter rows (array de arrays) para data (array de objetos)
          const data = execResult.rows && execResult.columns
            ? execResult.rows.map(row => {
              const obj: any = {}
              execResult.columns!.forEach((col, i) => {
                obj[col] = row[i]
              })
              return obj
            })
            : []

          const executedResult = {
            ...result,
            executionSuccess: !!execResult.success,
            executionTime: Date.now() - execStartTime,
            rowCount: execResult.rowCount || 0,
            data, // Array de objetos para o frontend
            columns: execResult.columns || [],
            executionError: execResult.error || undefined
          }

          console.log(`📦 Resultado final do ${result.provider}:`, {
            executionSuccess: executedResult.executionSuccess,
            rowCount: executedResult.rowCount,
            hasData: !!executedResult.data,
            dataLength: executedResult.data?.length,
            hasColumns: !!executedResult.columns,
            columnsLength: executedResult.columns?.length
          })

          return executedResult
        } catch (error) {
          console.error(`❌ Erro ao executar SQL do ${result.provider}:`, error)
          return {
            ...result,
            executionSuccess: false,
            executionTime: Date.now() - execStartTime,
            executionError: error instanceof Error ? error.message : 'Erro desconhecido'
          }
        }
      })

      const executedResults = await Promise.all(executionPromises)

      console.log('📊 Resultados após execução:', executedResults.map(r => ({
        provider: r.provider,
        success: r.success,
        executionSuccess: r.executionSuccess,
        rowCount: r.rowCount
      })))

      // 6. Determinar melhor resultado (primeiro com execução bem-sucedida)
      const bestResult = executedResults.find(r => r.success && r.executionSuccess && r.data && r.data.length > 0)
        || executedResults.find(r => r.success && r.sql)

      const finalResult = {
        success: executedResults.some(r => r.success),
        results: executedResults,
        reducedSchema: schemaResult.reducedSchema,
        totalProcessingTime: Date.now() - startTime,
        bestResult
      }

      console.log('🎯 Resultado final:', {
        success: finalResult.success,
        resultsCount: finalResult.results.length,
        hasBestResult: !!finalResult.bestResult
      })

      return finalResult

    } catch (error) {
      console.error('❌ Erro na geração SQL paralela:', error)
      return {
        success: false,
        results: [],
        totalProcessingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Obtém schema em formato compacto para LLMs
   */
  private async getReducedSchema(question?: string): Promise<{
    success: boolean
    reducedSchema?: string
    error?: string
  }> {
    try {
      console.log('📊 Obtendo schema compacto...')

      if (question && question.trim().length > 0) {
        // Tentativa 1: RAG semântico
        try {
          const ragService = SchemaEmbeddingService.getInstance()
          if (await ragService.isIndexed()) {
            console.log('🔍 Utilizando RAG semântico para seleção de tabelas...')
            const ragTables = await ragService.findSimilarTables(question)
            if (ragTables.length > 0) {
              const bySchema = new Map<string, string[]>()
              for (const { tableName, schemaName } of ragTables) {
                if (!bySchema.has(schemaName)) bySchema.set(schemaName, [])
                bySchema.get(schemaName)!.push(tableName)
              }

              const allTables: any[] = []
              for (const [schema, tables] of bySchema) {
                const ragResult = await this.schemaReducer.reduceSchemaFromSeed(tables, schema, false)
                if (ragResult.success && ragResult.reducedSchema) {
                  const parsed = JSON.parse(ragResult.reducedSchema)
                  allTables.push(...(parsed.tables || []))
                }
              }

              if (allTables.length > 0) {
                console.log(`✅ RAG selecionou ${allTables.length} tabelas de ${bySchema.size} schema(s): ${[...bySchema.keys()].join(', ')}`)
                return { success: true, reducedSchema: this.formatSchemaToText({ tables: allTables }) }
              }
            }
          }
        } catch (ragError) {
          console.warn('⚠️ RAG falhou, usando keyword matching:', ragError instanceof Error ? ragError.message : ragError)
        }

        // Tentativa 2: keyword matching
        console.log('🧠 Utilizando SmartSchemaReducer baseado na pergunta...')
        const reductionResult = await this.schemaReducer.reduceSchema({
          question,
          schemaName: 'inep',
          maxTables: 15,
          includeRelationships: false
        })

        if (reductionResult.success && reductionResult.reducedSchema) {
          console.log(`✅ Schema reduzido com sucesso! Tabelas selecionadas: ${reductionResult.selectedTables?.length}`)
          return { success: true, reducedSchema: this.formatSchemaToText(JSON.parse(reductionResult.reducedSchema)) }
        }

        console.warn(`⚠️ SmartSchemaReducer falhou: ${reductionResult.error}, fazendo fallback para schema completo`)
      }

      // Fallback: schema completo
      const fullSchema = await this.schemaService.getSchemaForLLM('inep')
      if (!fullSchema || !fullSchema.tables || fullSchema.tables.length === 0) {
        return { success: false, error: 'Schema do banco não encontrado' }
      }

      console.log(`✅ Schema inteiro obtido: ${fullSchema.tables.length} tabelas`)
      return { success: true, reducedSchema: this.formatSchemaToText(fullSchema) }

    } catch (error) {
      console.error('❌ Erro ao obter schema:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar schema'
      }
    }
  }

  private formatSchemaToText(parsedSchema: any): string {
    const cestaSchemaSet = new Set(['uf_ibge', 'idhms', 'pibs_per_capita', 'variaveis_pib_municipios_ibge', 'ibge_demografia_municipios'])
    const dictionary = this.buildSchemaColumnDict()

    const lines: string[] = ['SCHEMAS DISPONÍVEIS: inep e cesta']

    if (parsedSchema.tables && Array.isArray(parsedSchema.tables)) {
      parsedSchema.tables.forEach((table: any) => {
        const enrichedCols = (table.columns || []).map((col: string) =>
          this.formatColumnForPrompt(col, dictionary)
        )
        const schemaPrefix = cestaSchemaSet.has(table.name) ? 'cesta' : 'inep'
        lines.push(`Tabela \`${schemaPrefix}.${table.name}\`: Colunas [ ${enrichedCols.join(', ')} ]`)
      })
    }

    lines.push(this.buildJoinRelationships())
    const schemaStr = lines.join('\n')
    console.log(`📏 Schema em texto: ${(schemaStr.length / 1024).toFixed(1)}KB`)
    return schemaStr
  }

  /**
   * Constrói contexto da conversa para geração de SQL
   */
  private buildConversationContext(conversationHistory?: any[]): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return ""
    }

    // Pegar as últimas 4 mensagens (2 pares usuário-assistente)
    const recentMessages = conversationHistory.slice(-4)

    if (recentMessages.length === 0) {
      return ""
    }

    const contextLines = recentMessages
      .filter(msg => msg.tipo === 'user' || (msg.tipo === 'assistant' && msg.sqlQuery))
      .map(msg => {
        if (msg.tipo === 'user') {
          return `Pergunta anterior: ${msg.conteudo}`
        } else if (msg.sqlQuery) {
          return `SQL anterior: ${msg.sqlQuery}`
        }
        return null
      })
      .filter(Boolean)

    if (contextLines.length === 0) {
      return ""
    }

    return `
### Contexto da Conversa
${contextLines.join('\n')}

### Pergunta Atual
`
  }

  /**
   * Gera SQL baseado no modelo selecionado
   */
  private async generateSQLByModel(
    question: string,
    model: string,
    reducedSchema: string,
    conversationHistory?: any[]
  ): Promise<{
    success: boolean
    sql?: string
    explanation?: string
    error?: string
  }> {
    try {
      // Construir contexto da conversa
      const conversationContext = this.buildConversationContext(conversationHistory)

      if (model === 'deepseek-v3') {
        const r = await this.generateWithDeepSeek(question, reducedSchema, conversationContext)
        return { success: r.success, sql: r.sql, explanation: r.explanation, error: r.error }
      } else {
        return await this.generateWithLLM(question, model, reducedSchema, conversationContext)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na geração SQL'
      }
    }
  }

  /**
   * Gera SQL usando DeepSeek-V3 via OpenRouter
   */
  private async generateWithDeepSeek(
    question: string,
    reducedSchema: string,
    conversationContext: string = ""
  ): Promise<ParallelSQLResult> {
    const startTime = Date.now()

    if (!this.openRouterService) {
      return {
        provider: 'deepseek',
        model: 'deepseek-v3',
        success: false,
        status: 'error',
        error: 'OpenRouter service não disponível (OPENROUTER_API_KEY ausente)',
        processingTime: Date.now() - startTime
      }
    }

    try {
      const prompt = this.buildSQLGenerationPrompt(question, reducedSchema, conversationContext)

      const result = await this.openRouterService.generateResponse({ prompt })

      if (!result.success) {
        return {
          provider: 'deepseek',
          model: 'deepseek-v3',
          success: false,
          status: 'error',
          error: result.error,
          processingTime: Date.now() - startTime
        }
      }

      const sql = this.extractSQL(result.content || '')

      const validation = await this.validateAndSanitizeSQL(sql)

      if (!validation.isValid) {
        return {
          provider: 'deepseek',
          model: 'deepseek-v3',
          success: false,
          status: 'error',
          error: `SQL inválido: ${validation.errors.join(', ')}`,
          processingTime: Date.now() - startTime
        }
      }

      const explanation = this.extractExplanation(result.content || '')

      return {
        provider: 'deepseek',
        model: 'deepseek-v3',
        success: true,
        status: 'complete',
        prompt,
        sql: validation.sanitizedSQL!,
        explanation,
        validationWarnings: validation.warnings,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        provider: 'deepseek',
        model: 'deepseek-v3',
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Constrói o prompt otimizado unificado usando técnica de Chain of Thought
   */
  private buildSQLGenerationPrompt(
    question: string,
    reducedSchema: string,
    conversationContext: string = "",
    maxExamples: number = 3
  ): string {
    return `Você é um Engenheiro de Dados Sênior e especialista em bancos de dados relacionais (PostgreSQL), focado exclusivamente nos dados educacionais do INEP (Brasil).
Sua missão é traduzir a pergunta do usuário para uma consulta SQL altamente otimizada, precisa e segura.

📋 CONTEXTO DA CONVERSA:
${conversationContext || "Nenhum contexto anterior."}
${conversationContext ? `\n⚠️ ATENÇÃO CRÍTICA: A pergunta abaixo é NOVA e DIFERENTE das perguntas anteriores mostradas no contexto. Você DEVE gerar SQL APENAS para esta pergunta específica, NUNCA reutilize ou adapte SQL de perguntas anteriores.\n` : ""}
🎯 PERGUNTA ATUAL: ${question}

📊 SCHEMA DO BANCO DE DADOS DISPONÍVEL:
${reducedSchema}

⚖️ REGRAS DE OURO (LEIA ATENTAMENTE):

1. **TABELAS DE INSTITUIÇÕES (ESCOLHA COM CUIDADO)**:
   - ✅ **USE \`CENSO_IES_BRUTO\` (Preferencial para filtros geográficos/temporais/tipo)**: Tem colunas de estado (\`sg_uf_ies\`), município (\`no_municipio_ies\`), região (\`no_regiao_ies\`), capital (\`in_capital_ies\`), ano (\`nu_ano_censo\`), tipo (\`tp_organizacao_academica\`) e categoria (\`tp_categoria_administrativa\`) EMBUTIDAS — **sem necessidade de cadeia de JOINs geográficos**. Código da IES: \`co_ies\`. Para filtrar por tipo: \`tp_organizacao_academica\` (1=Universidade, 2=Centro Universitário, 3=Faculdade, 4=Instituto Federal).
   - ✅ **USE \`CENSO_IES\` (Alternativo)**: Para cruzamentos via \`cod_municipio\` com tabelas geográficas, ou quando precisar de \`id_organizacao_academica\` / \`id_categoria_administrativa\` especificamente.
     * Esta tabela cruza com geografia usando: \`censo_ies.cod_municipio = municipios_ibge.cod_ibge\`
     * ⚠️ ATENÇÃO: \`censo_ies\` é uma dimensão estática (SEM \`nu_ano_censo\`). Se usar esta tabela sem filtro de ano, você retornará IES históricas de TODAS as edições do censo, não apenas a mais recente. Para perguntas sobre IES atuais filtradas por cidade/município, prefira \`censo_ies_bruto\` com \`nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)\`.
     * 🚨 PROIBIDO para perguntas por cidade/município: NUNCA use \`censo_ies c JOIN municipios_ibge m ON c.cod_municipio = m.cod_ibge WHERE m.nome_municipio = 'XYZ'\` — isso retorna IES de TODAS as edições históricas (ex: 66 rows em vez de 38 do último censo). Use \`censo_ies_bruto WHERE no_municipio_ies ILIKE '%XYZ%' AND nu_ano_censo = (SELECT MAX...)\`.
   - ⚠️ **USE \`EMEC_INSTITUICOES\` (Auxiliar)**: **SOMENTE** se a pergunta solicitar dados de contato (telefone, email, site, cnpj), site, IGC ou CI.
     * ⚠️ Esta tabela NÃO cruza facilmente com geografia (não tem código numérico de município), e NÃO TEM a flag \`in_capital\`.
     * Cursos cruzam com ela via: \`emec_instituicoes.co_ies = censo_cursos.cod_ies\`

2. **CADEIA GEOGRÁFICA (OBRIGATÓRIO PARA REGIÕES/ESTADOS)**:
   A ligação com a geografia deve OBRIGATORIAMENTE seguir esta cadeia exata:
   \`censo_ies\` ➔ \`municipios_ibge\` ➔ \`microregioes_ibge\` ➔ \`mesoregioes_ibge\` ➔ \`uf_ibge\` ➔ \`regioes_ibge\`
   - Joins corretos:
     \`\`\`sql
     c.cod_municipio = m.cod_ibge
     m.cod_microregiao_ibge = mi.cod_microregiao_ibge
     mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
     me.cod_uf_ibge = u.co_uf_ibge
     u.co_regiao_ibge = r.cod_regiao_ibge
     \`\`\`

3. **RESTRIÇÕES DE COLUNAS (ALUCINAÇÃO É ESTRITAMENTE PROIBIDA)**:
   - 🚨 CRÍTICO: USE EXATAMENTE E APENAS AS COLUNAS LISTADAS NO SCHEMA ACIMA.
   - ❌ NUNCA INVENTE NOMES DE COLUNAS. Por exemplo, se no schema está \`cod_curso\`, não invente e não escreva \`co_curso\`.
   - ❌ ATENÇÃO ESPECIAL: Na tabela \`censo_ies\` e \`censo_cursos\`, a coluna de código da IES é SECAMENTE \`cod_ies\`, NUNCA \`co_ies\`. Na tabela \`emec_instituicoes\` é \`co_ies\`. O banco de dados vai FALHAR se você errar isso.
   - ❌ NUNCA USE: \`municipios_ibge.cod_uf_ibge\` (Siga a cadeia mostrada acima).
   - ❌ NUNCA USE: \`censo_ies.cod_categoria_administrativa\` (O nome correto no schema é \`id_categoria_administrativa\`).
   - ❌ NUNCA USE: \`uf_ibge.nome_uf\` ou \`uf_ibge.sigla_uf\` (O nome correto é \`no_uf_ibge\` e o PK é \`co_uf_ibge\`).
   - ❌ NUNCA USE: \`emec_instituicoes.in_capital\` (Só existe na \`censo_ies\`).
   - Use os tipos de dados originais. Para strings, sempre utilize \`ILIKE\` em buscas textuais para ser case-insensitive.

4. **PREFIXO DE SCHEMA (ATENÇÃO)**:
   - A maioria das tabelas usa o prefixo \`inep.\`: \`censo_ies\`, \`censo_cursos\`, \`censo_curso_vagas_bruto\`, \`emec_instituicoes\`, \`municipios_ibge\`, \`microregioes_ibge\`, \`mesoregioes_ibge\`, \`regioes_ibge\`, \`dados_cpc\`, \`dados_enade\`, \`dados_igc\`.
   - ⚠️ EXCEÇÃO CRÍTICA: A tabela \`uf_ibge\` pertence ao schema \`cesta\` — SEMPRE use \`cesta.uf_ibge\`, NUNCA \`inep.uf_ibge\`.
   - Também são do schema \`cesta\`: \`idhms\`, \`pibs_per_capita\`, \`variaveis_pib_municipios_ibge\`.

5. **PERFORMANCE**:
   - Sempre limite os resultados: \`LIMIT 50\` em queries com JOINs abertos, ou \`LIMIT 100\` em consultas simples.

6. **CURSOS: DICIONÁRIO vs FATOS (CRÍTICO)**:
   - \`censo_cursos\` = DICIONÁRIO (nome do curso, código, modalidade de ingresso). **NÃO TEM**: \`qt_mat\`, \`nu_ano_censo\`, \`qt_ing\`, \`qt_vg_total\`, \`qt_conc\`.
   - \`censo_curso_vagas_bruto\` = FATOS ANUAIS (série temporal). **USE SEMPRE** para matrículas, vagas, ingressantes, concluintes ou qualquer dado com dimensão de ano.
   - JOIN entre elas: \`censo_curso_vagas_bruto.co_curso = censo_cursos.cod_curso\`
   - ❌ NUNCA coloque \`qt_mat\` ou \`nu_ano_censo\` em \`censo_cursos\` — o banco vai FALHAR.

7. **JOIN TEMPORAL OBRIGATÓRIO (censo_ies_bruto × censo_curso_vagas_bruto)**:
   - 🚨 \`censo_ies_bruto\` também é uma série temporal (tem \`nu_ano_censo\`). Todo JOIN entre ela e \`censo_curso_vagas_bruto\` **DEVE** incluir a condição de ano, caso contrário cria produto cartesiano com 14x os dados.
   - ❌ NUNCA faça: \`JOIN censo_ies_bruto b ON v.co_ies = b.co_ies\` (sem ano = produto cartesiano, valores inflados 14x e timeout)
   - ✅ SEMPRE faça: \`JOIN censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo\`
   - Exemplo correto para IES + vagas anuais:
     \`\`\`sql
     SELECT b.no_ies, b.sg_ies, SUM(v.qt_mat) AS total_matriculados
     FROM inep.censo_curso_vagas_bruto v
     JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
     WHERE v.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_curso_vagas_bruto)
       AND b.tp_categoria_administrativa IN (4, 5, 6, 7)
     GROUP BY b.no_ies, b.sg_ies
     ORDER BY total_matriculados DESC LIMIT 10
     \`\`\`

🚫 ANTI-PADRÕES CONFIRMADOS — ESTES ERROS JÁ FORAM OBSERVADOS E CAUSAM FALHAS GRAVES:

❌ ANTI-PADRÃO 1 — JOIN EXPLOSIVO (produto cartesiano):
   ERRADO:  JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies
   CORRETO: JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
   CONSEQUÊNCIA: Sem AND de ano → 8,7 MILHÕES de linhas → valores inflados 14× e timeout de 45s

❌ ANTI-PADRÃO 2 — TABELA HISTÓRICA SEM FILTRO DE ANO PARA CIDADE:
   ERRADO:  FROM inep.censo_ies c JOIN inep.municipios_ibge m ON c.cod_municipio = m.cod_ibge WHERE m.nome_municipio = 'Curitiba'
   CORRETO: FROM inep.censo_ies_bruto WHERE no_municipio_ies ILIKE '%Curitiba%' AND nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
   CONSEQUÊNCIA: census_ies não tem nu_ano_censo → retorna IES de TODAS as edições históricas (ex: 66 rows em vez de 38)

❌ ANTI-PADRÃO 3 — SALTO NA CADEIA GEOGRÁFICA:
   ERRADO:  JOIN inep.mesoregioes_ibge me ON m.cod_microregiao_ibge = me.cod_mesoregiao_ibge
   CORRETO: JOIN inep.microregioes_ibge mi ON m.cod_microregiao_ibge = mi.cod_microregiao_ibge
            JOIN inep.mesoregioes_ibge me ON mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
   CONSEQUÊNCIA: Chaves têm formatos diferentes (7 vs 4 chars) → 0 linhas retornadas

💡 EXEMPLOS PRÁTICOS ESPERADOS:
${this.getDynamicExamples(question, maxExamples)}

🧠 SUA TAREFA (CHAIN OF THOUGHT):
1. Primeiro, pense passo-a-passo. Escreva um parágrafo conciso explicando qual intenção você entendeu, quais tabelas serão escolhidas e por que.
2. Liste explicitamente as colunas que você vai usar e confirme visualmente que elas **existem** no schema fornecido acima. NUNCA invente colunas como 'co_municipio' ou 'nome_uf', sempre cheque os nomes corretos.
3. Em seguida, dê a resposta final em formato SQL padrão isolado por \`\`\`sql. Não coloque \`;\` após a query, não adicione comentários adicionais dentro do bloco da query.
4. Por fim, em uma única linha iniciada exatamente com "EXPLICAÇÃO:", descreva em linguagem simples e amigável o que a query retorna, sem usar termos técnicos ou nomes de tabelas.`;
  }

  /**
   * Seleciona os melhores exemplos (Few-Shot Dinâmico) baseado em palavras-chave.
   * Pool expandido para cobrir os padrões mais comuns do test set.
   */
  private getDynamicExamples(question: string, maxExamples: number = 3): string {
    const q = question.toLowerCase()
    const pool = [
      {
        tags: ['capital', 'capitais', 'cidade'],
        text: `Exemplo (Uso correto da censo_ies para capitais):
\`\`\`sql
SELECT COUNT(*) FROM inep.censo_ies WHERE in_capital = 1
\`\`\``
      },
      {
        tags: ['contato', 'telefone', 'email', 'site'],
        text: `Exemplo (Uso obrigatório da emec_instituicoes para contatos):
\`\`\`sql
SELECT no_ies, telefone, email FROM inep.emec_instituicoes WHERE no_ies ILIKE '%Pernambuco%' LIMIT 50
\`\`\``
      },
      {
        tags: ['regiao', 'nordeste', 'sul', 'sudeste', 'norte', 'centro-oeste'],
        text: `Exemplo (Cadeia geográfica obrigatória via censo_ies — note cesta.uf_ibge):
\`\`\`sql
SELECT r.descr_regiao_ibge AS regiao, COUNT(DISTINCT c.cod_ies) AS total_instituicoes
FROM inep.censo_ies c
JOIN inep.municipios_ibge m ON c.cod_municipio = m.cod_ibge
JOIN inep.microregioes_ibge mi ON m.cod_microregiao_ibge = mi.cod_microregiao_ibge
JOIN inep.mesoregioes_ibge me ON mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
JOIN cesta.uf_ibge u ON me.cod_uf_ibge = u.co_uf_ibge
JOIN inep.regioes_ibge r ON u.co_regiao_ibge = r.cod_regiao_ibge
WHERE r.descr_regiao_ibge ILIKE 'Nordeste'
GROUP BY r.descr_regiao_ibge
\`\`\``
      },
      {
        tags: ['estado', 'uf', 'minas gerais', 'sao paulo', 'rio de janeiro', 'bahia', 'parana', 'rs', 'mg', 'sp', 'rj'],
        text: `Exemplo (Filtro por estado — use censo_ies_bruto, sem JOINs geográficos):
\`\`\`sql
SELECT sg_uf_ies AS estado, COUNT(DISTINCT co_ies) AS total_universidades
FROM inep.censo_ies_bruto
WHERE tp_organizacao_academica = 1
  AND nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_ies_bruto)
GROUP BY sg_uf_ies
ORDER BY total_universidades DESC
LIMIT 50
\`\`\`
Nota: Use censo_ies_bruto para filtros por sg_uf_ies, no_municipio_ies, no_regiao_ies, nu_ano_censo — sem cadeia de JOINs.`
      },
      {
        tags: ['matriculas', 'matriculados', 'vagas', 'ingressantes', 'concluintes', 'ano', 'censo', '2023', '2022', '2021', '2020'],
        text: `Exemplo (Dados anuais — SEMPRE use censo_curso_vagas_bruto, nunca censo_cursos):
\`\`\`sql
SELECT cc.nome_curso, SUM(v.qt_mat) AS total_matriculas
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_cursos cc ON v.co_curso = cc.cod_curso
WHERE v.nu_ano_censo = 2023
  AND cc.nome_curso ILIKE '%engenharia%'
GROUP BY cc.nome_curso
ORDER BY total_matriculas DESC
LIMIT 50
\`\`\`
Nota: qt_mat, qt_ing, qt_vg_total, nu_ano_censo existem APENAS em censo_curso_vagas_bruto (range 2010–2023).`
      },
      {
        tags: ['privado', 'privada', 'particular', 'ead', 'ies', 'instituicao', 'instituicoes', 'matriculados', 'maior', 'alunos', 'vagas', 'ano', 'censo', 'ultimo', 'bruto', 'ingressantes', 'concluintes', 'ranking'],
        text: `Exemplo (JOIN temporal obrigatório entre censo_ies_bruto e censo_curso_vagas_bruto):
\`\`\`sql
-- CORRETO: JOIN com AND de ano (OBRIGATÓRIO para evitar produto cartesiano)
SELECT b.no_ies, b.sg_ies, SUM(v.qt_mat) AS total_matriculados
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo
WHERE v.nu_ano_censo = (SELECT MAX(nu_ano_censo) FROM inep.censo_curso_vagas_bruto)
  AND v.tp_modalidade_ensino = 2
  AND b.tp_categoria_administrativa IN (4, 5, 6, 7)
GROUP BY b.no_ies, b.sg_ies
ORDER BY total_matriculados DESC
LIMIT 5
\`\`\`
ATENÇÃO: NUNCA omita o AND v.nu_ano_censo = b.nu_ano_censo no JOIN — sem ele, são 8,7M de linhas e timeout.`
      },
      {
        tags: ['presencial', 'ead', 'modalidade', 'distancia', 'a distancia'],
        text: `Exemplo (Filtro por modalidade de ensino com dados anuais):
\`\`\`sql
SELECT tp_modalidade_ensino, SUM(qt_mat) AS total_matriculas
FROM inep.censo_curso_vagas_bruto
WHERE nu_ano_censo = 2023
GROUP BY tp_modalidade_ensino
\`\`\`
Nota: tp_modalidade_ensino (1=Presencial, 2=EAD) existe em censo_curso_vagas_bruto. Em censo_cursos a coluna é id_modalidade_ensino.`
      },
      {
        tags: ['curso', 'medicina', 'direito', 'engenharia', 'enfermagem', 'administracao', 'sistemas', 'computacao'],
        text: `Exemplo (Cruzamento entre cursos e instituições):
\`\`\`sql
SELECT c.nome_curso, e.no_ies, e.site
FROM inep.censo_cursos c
JOIN inep.emec_instituicoes e ON c.cod_ies = e.co_ies
WHERE c.nome_curso ILIKE '%medicina%'
LIMIT 50
\`\`\``
      },
      {
        tags: ['feminino', 'masculino', 'genero', 'mulheres', 'homens', 'proporcao', 'percentual', 'sexo'],
        text: `Exemplo (Proporção de gênero em matrículas — use qt_mat_fem e qt_mat_masc):
\`\`\`sql
SELECT
  cc.nome_curso,
  SUM(v.qt_mat_fem) AS matriculas_femininas,
  SUM(v.qt_mat_masc) AS matriculas_masculinas,
  ROUND(100.0 * SUM(v.qt_mat_fem) / NULLIF(SUM(v.qt_mat_fem + v.qt_mat_masc), 0), 1) AS pct_feminino
FROM inep.censo_curso_vagas_bruto v
JOIN inep.censo_cursos cc ON v.co_curso = cc.cod_curso
WHERE v.nu_ano_censo = 2023
  AND cc.nome_curso ILIKE '%engenharia%'
GROUP BY cc.nome_curso
ORDER BY pct_feminino DESC
LIMIT 50
\`\`\``
      },
      {
        tags: ['cpc', 'desempenho', 'qualidade', 'avaliacao', 'nota', 'conceito', 'score', 'ranking'],
        text: `Exemplo (Notas CPC por curso e estado — use dados_cpc):
\`\`\`sql
SELECT b.sg_uf_ies AS estado, cc.nome_curso,
       ROUND(AVG(cpc.cpc_continuo)::numeric, 2) AS media_cpc
FROM inep.dados_cpc cpc
JOIN inep.censo_curso_vagas_bruto b ON cpc.co_ies = b.co_ies AND cpc.co_curso = b.co_curso AND cpc.ano = b.nu_ano_censo
JOIN inep.censo_cursos cc ON cpc.co_curso = cc.cod_curso
WHERE cc.nome_curso ILIKE '%direito%'
GROUP BY b.sg_uf_ies, cc.nome_curso
ORDER BY media_cpc DESC
LIMIT 50
\`\`\`
Nota: dados_cpc tem co_ies (int), co_curso (int), ano (int), cpc_continuo (numeric 0–5), cpc_faixa (1–5).`
      },
      {
        tags: ['evasao', 'desistencia', 'abandono', 'dropout', 'conclusao', 'taxa', 'fluxo', 'permanencia'],
        text: `Exemplo (Taxa de desistência por curso — use fluxo_tda):
\`\`\`sql
SELECT f.no_curso, f.no_ies, f.sg_uf_ies AS estado,
       ROUND(AVG(f.tda)::numeric * 100, 1) AS taxa_desistencia_pct
FROM inep.fluxo_tda f
WHERE f.no_curso ILIKE '%administracao%'
  AND f.nu_ano_referencia = (SELECT MAX(nu_ano_referencia) FROM inep.fluxo_tda)
GROUP BY f.no_curso, f.no_ies, f.sg_uf_ies
ORDER BY taxa_desistencia_pct DESC
LIMIT 50
\`\`\`
Nota: fluxo_tda tem tda (desistência 0–1), tca (conclusão 0–1), tap (permanência 0–1). sg_uf_ies é varchar.`
      },
      {
        tags: ['igc', 'indice', 'geral', 'cursos', 'ranking', 'melhor', 'pior'],
        text: `Exemplo (IGC das instituições — use dados_igc + emec_instituicoes):
\`\`\`sql
SELECT e.no_ies, ig.ano, ig.igc_continuo, ig.igc_faixa
FROM inep.dados_igc ig
JOIN inep.emec_instituicoes e ON ig.co_ies = e.co_ies
WHERE ig.ano = (SELECT MAX(ano) FROM inep.dados_igc)
ORDER BY ig.igc_continuo DESC
LIMIT 10
\`\`\`
Nota: dados_igc.co_ies = emec_instituicoes.co_ies. igc_faixa: 1–5. igc_continuo: numeric 0–5.`
      },
      {
        tags: ['capes', 'pos-graduacao', 'pos graduacao', 'mestrado', 'doutorado', 'stricto', 'programa'],
        text: `Exemplo (Programas de pós-graduação por área — use capes_programas_bruto):
\`\`\`sql
SELECT nm_area_conhecimento, COUNT(*) AS total_programas
FROM inep.capes_programas_bruto
WHERE an_base = (SELECT MAX(an_base) FROM inep.capes_programas_bruto)
GROUP BY nm_area_conhecimento
ORDER BY total_programas DESC
LIMIT 20
\`\`\``
      }
    ]

    // Score examples by keyword matches
    const scored = pool.map(ex => {
      let score = 0
      ex.tags.forEach(tag => { if (q.includes(tag)) score++ })
      return { ...ex, score }
    })

    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, maxExamples).map(ex => ex.text).join('\n\n')
  }

  /**
   * Tenta auto-corrigir uma query SQL que falhou na execução.
   * Classifica o erro PostgreSQL para fornecer um hint direcionado ao LLM.
   */
  private async retrySQLGeneration(
    provider: string,
    model: string,
    question: string,
    failedSql: string,
    error: string,
    reducedSchema: string,
    conversationContext: string
  ): Promise<{ success: boolean, sql?: string }> {
    console.log(`🔄 Tentativa de auto-correção para ${provider}...`)

    const { hint } = this.classifyPostgresError(error, failedSql)

    const maxExamples = provider === 'groq' ? 1 : 3
    const basePrompt = this.buildSQLGenerationPrompt(question, reducedSchema, conversationContext, maxExamples)
    const correctionPrompt = `${basePrompt}

🚨 CORREÇÃO NECESSÁRIA: A consulta SQL abaixo falhou na execução.

DIAGNÓSTICO DO ERRO: ${hint}

ERRO ORIGINAL DO BANCO:
${error}

CONSULTA QUE FALHOU:
\`\`\`sql
${failedSql}
\`\`\`

Aplique o diagnóstico acima, corrija APENAS o problema identificado e forneça o SQL corrigido completo.`

    try {
      if (provider === 'gemini') {
        const result = await this.llmService.handlePrompt({
          prompt: correctionPrompt,
          model,
          context: { schemaName: 'inep' }
        })
        if (result.success && result.content) {
          return { success: true, sql: this.extractSQL(result.content) }
        }
      } else if (provider === 'groq' && this.groqService) {
        const result = await this.groqService.generateResponse({
          prompt: correctionPrompt,
          model
        })
        if (result.success && result.content) {
          return { success: true, sql: this.extractSQL(result.content) }
        }
      } else if (provider === 'deepseek' && this.openRouterService) {
        const result = await this.openRouterService.generateResponse({ prompt: correctionPrompt })
        if (result.success && result.content) {
          return { success: true, sql: this.extractSQL(result.content) }
        }
      }
    } catch (e) {
      console.error(`❌ Erro na auto-correção ${provider}:`, e)
    }

    return { success: false }
  }

  /**
   * Gera SQL usando LLM (Gemini com fallback para Groq)
   */
  private async generateWithLLM(
    question: string,
    model: string,
    reducedSchema: string,
    conversationContext: string = ""
  ): Promise<{
    success: boolean
    sql?: string
    explanation?: string
    error?: string
  }> {
    const prompt = this.buildSQLGenerationPrompt(question, reducedSchema, conversationContext)

    const result = await this.llmService.handlePrompt({
      prompt,
      model,
      context: { schemaName: 'inep' }
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    const content = result.content || ''
    return {
      success: true,
      sql: this.extractSQL(content),
      explanation: this.extractExplanation(content)
    }
  }

  /**
   * Extrai SQL da resposta (método unificado)
   */
  private extractSQL(response: string): string {
    // Usar o método já testado do CloudflareAI
    return this.cloudflareAI.extractSQL(response)
  }

  private extractExplanation(response: string): string {
    const match = response.match(/^EXPLICA[ÇC][ÃA]O:\s*(.+)$/im)
    return match ? match[1].trim() : ''
  }

  /**
   * Gera SQL usando Gemini especificamente
   */
  private async generateWithGemini(
    question: string,
    reducedSchema: string,
    conversationContext: string = ""
  ): Promise<ParallelSQLResult> {
    const startTime = Date.now()

    try {
      const prompt = this.buildSQLGenerationPrompt(question, reducedSchema, conversationContext)

      const result = await this.llmService.handlePrompt({
        prompt,
        model: 'gemini-2.5-flash-lite',
        context: { schemaName: 'inep' }
      })

      if (!result.success) {
        return {
          provider: 'gemini',
          model: 'gemini-2.5-flash-lite',
          success: false,
          status: 'error',
          error: result.error,
          processingTime: Date.now() - startTime
        }
      }

      const sql = this.extractSQL(result.content || '')

      // Validar SQL
      const validation = await this.validateAndSanitizeSQL(sql)

      if (!validation.isValid) {
        return {
          provider: 'gemini',
          model: 'gemini-2.5-flash-lite',
          success: false,
          status: 'error',
          error: `SQL inválido: ${validation.errors.join(', ')}`,
          processingTime: Date.now() - startTime
        }
      }

      const explanation = this.extractExplanation(result.content || '')

      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        success: true,
        status: 'complete',
        prompt,
        sql: validation.sanitizedSQL!,
        explanation,
        validationWarnings: validation.warnings,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Gera SQL usando Groq especificamente
   */
  private async generateWithGroq(
    question: string,
    reducedSchema: string,
    conversationContext: string = ""
  ): Promise<ParallelSQLResult> {
    const startTime = Date.now()

    if (!this.groqService) {
      return {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        success: false,
        status: 'error',
        error: 'Groq service não disponível',
        processingTime: Date.now() - startTime
      }
    }

    try {
      const prompt = this.buildSQLGenerationPrompt(question, reducedSchema, conversationContext, 1)

      const result = await this.groqService.generateResponse({
        prompt,
        model: 'llama-3.3-70b-versatile'
      })

      if (!result.success) {
        return {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          success: false,
          status: 'error',
          error: result.error,
          processingTime: Date.now() - startTime
        }
      }

      const sql = this.extractSQL(result.content || '')

      // Validar SQL
      const validation = await this.validateAndSanitizeSQL(sql)

      if (!validation.isValid) {
        return {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          success: false,
          status: 'error',
          error: `SQL inválido: ${validation.errors.join(', ')}`,
          processingTime: Date.now() - startTime
        }
      }

      const explanation = this.extractExplanation(result.content || '')

      return {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        success: true,
        status: 'complete',
        prompt,
        sql: validation.sanitizedSQL!,
        explanation,
        validationWarnings: validation.warnings,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        processingTime: Date.now() - startTime
      }
    }
  }


  /**
   * Corrige automaticamente alucinações comuns do LLM
   */
  /**
   * Detecta e corrige deterministicamente JOINs temporais faltando a condição de ano.
   * Específico para o par censo_ies_bruto × censo_curso_vagas_bruto — sem AND nu_ano_censo
   * o join produz ~8,7M linhas (produto cartesiano), causando timeout e valores 14× inflados.
   */
  private enforceTemporalJoinConstraints(sql: string): { sql: string; warnings: string[] } {
    const warnings: string[] = []

    const hasCensoIesBruto = /censo_ies_bruto/i.test(sql)
    const hasCensoVagasBruto = /censo_curso_vagas_bruto/i.test(sql)

    if (!hasCensoIesBruto || !hasCensoVagasBruto) {
      return { sql, warnings }
    }

    // Extrair aliases das duas tabelas
    const iesBrutoAliasMatch = sql.match(/\bcenso_ies_bruto\s+(\w+)/i)
    const vagasBrutoAliasMatch = sql.match(/\bcenso_curso_vagas_bruto\s+(\w+)/i)

    if (!iesBrutoAliasMatch || !vagasBrutoAliasMatch) {
      return { sql, warnings }
    }

    const iesBrutoAlias = iesBrutoAliasMatch[1]
    const vagasBrutoAlias = vagasBrutoAliasMatch[1]

    // Verificar se a condição temporal já existe
    const temporalConditionRegex = new RegExp(
      `(${iesBrutoAlias}|${vagasBrutoAlias})\\.nu_ano_censo\\s*=\\s*(${iesBrutoAlias}|${vagasBrutoAlias})\\.nu_ano_censo`,
      'i'
    )

    if (temporalConditionRegex.test(sql)) {
      return { sql, warnings }
    }

    // Tentar injetar a condição no JOIN de censo_ies_bruto
    const joinIesRegex = new RegExp(
      `(JOIN\\s+inep\\.censo_ies_bruto\\s+${iesBrutoAlias}\\s+ON\\s+[^\\n]+?)(?=\\s*(?:JOIN|LEFT|RIGHT|INNER|WHERE|GROUP|ORDER|LIMIT|HAVING|$))`,
      'is'
    )
    const joinIesMatch = sql.match(joinIesRegex)

    if (joinIesMatch) {
      const originalJoin = joinIesMatch[1]
      if (!originalJoin.toLowerCase().includes('nu_ano_censo')) {
        const fixedJoin = originalJoin.trimEnd() + ` AND ${vagasBrutoAlias}.nu_ano_censo = ${iesBrutoAlias}.nu_ano_censo`
        const fixedSQL = sql.replace(originalJoin, fixedJoin)
        warnings.push(`⚠️ JOIN temporal corrigido: adicionado AND ${vagasBrutoAlias}.nu_ano_censo = ${iesBrutoAlias}.nu_ano_censo para evitar produto cartesiano de 8,7M linhas.`)
        return { sql: fixedSQL, warnings }
      }
      return { sql, warnings }
    }

    // Tentar injetar no JOIN de censo_curso_vagas_bruto
    const joinVagasRegex = new RegExp(
      `(JOIN\\s+inep\\.censo_curso_vagas_bruto\\s+${vagasBrutoAlias}\\s+ON\\s+[^\\n]+?)(?=\\s*(?:JOIN|LEFT|RIGHT|INNER|WHERE|GROUP|ORDER|LIMIT|HAVING|$))`,
      'is'
    )
    const joinVagasMatch = sql.match(joinVagasRegex)

    if (joinVagasMatch) {
      const originalJoin = joinVagasMatch[1]
      if (!originalJoin.toLowerCase().includes('nu_ano_censo')) {
        const fixedJoin = originalJoin.trimEnd() + ` AND ${iesBrutoAlias}.nu_ano_censo = ${vagasBrutoAlias}.nu_ano_censo`
        const fixedSQL = sql.replace(originalJoin, fixedJoin)
        warnings.push(`⚠️ JOIN temporal corrigido: adicionado AND ${iesBrutoAlias}.nu_ano_censo = ${vagasBrutoAlias}.nu_ano_censo para evitar produto cartesiano de 8,7M linhas.`)
        return { sql: fixedSQL, warnings }
      }
      return { sql, warnings }
    }

    // Não conseguiu injetar automaticamente — pelo menos avisa
    warnings.push(`⚠️ AVISO: JOIN entre censo_ies_bruto e censo_curso_vagas_bruto sem condição de ano (nu_ano_censo). Isso pode causar produto cartesiano com ~8,7M linhas e timeout.`)
    return { sql, warnings }
  }

  private autoFixCommonHallucinations(sql: string): string {
    let fixedSQL = sql

    // Corrigir prefixo de schema para uf_ibge (tabela está em cesta, não inep)
    fixedSQL = fixedSQL.replace(/\binep\.(uf_ibge)\b/gi, 'cesta.$1')

    // Mapeamento de typos comuns identificados nas rodadas de teste
    // ATENÇÃO: co_ies e co_curso foram REMOVIDOS pois são nomes CORRETOS em emec_instituicoes
    // e censo_curso_vagas_bruto — substituição global causava mais dano do que correção
    // NOTA: 'sg_uf_ies' foi removido — é uma coluna VÁLIDA de censo_ies_bruto (sigla da UF da IES)
    const typoMap: Record<string, string> = {
      'co_municipio': 'cod_municipio',
      'cod_categoria_administrativa': 'id_categoria_administrativa',
      'nome_uf': 'no_uf_ibge',
      'nome_uf_ibge': 'no_uf_ibge',
    }

    for (const [wrong, right] of Object.entries(typoMap)) {
      const regex = new RegExp(`(?<!')\\b${wrong}\\b(?!')`, 'gi')
      fixedSQL = fixedSQL.replace(regex, right)
    }

    return fixedSQL
  }

  private levenshteinDistance(s1: string, s2: string): number {
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;
    let matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= s1.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion, deletion
          );
        }
      }
    }
    return matrix[s2.length][s1.length];
  }

  /**
   * Valida e sanitiza SQL de forma robusta, aplicando Auto-Correção e Validação de Colunas
   */
  private async validateAndSanitizeSQL(sql: string): Promise<SQLValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 1. Limpar SQL básico e Auto-Corrigir typos hardcoded
      let cleanSQL = this.autoFixCommonHallucinations(sql.trim())

      // 1b. Enforçar JOINs temporais obrigatórios (censo_ies_bruto × censo_curso_vagas_bruto)
      const temporalResult = this.enforceTemporalJoinConstraints(cleanSQL)
      cleanSQL = temporalResult.sql
      warnings.push(...temporalResult.warnings)

      // 2. Validações básicas de sintaxe
      if (!cleanSQL) {
        errors.push('SQL vazio')
        return { isValid: false, errors, warnings }
      }

      // 3. Verificar se é uma query SELECT válida
      if (!this.isValidSelectQuery(cleanSQL)) {
        errors.push('Apenas consultas SELECT são permitidas')
        return { isValid: false, errors, warnings }
      }

      // 4. Verificar prefixo de tabelas
      const tableValidation = this.validateTablePrefixes(cleanSQL)
      if (!tableValidation.isValid) {
        errors.push(...tableValidation.errors)
      }
      warnings.push(...tableValidation.warnings)

      // 5. Validar colunas contra o schema e tentar corrigir com Fuzzy Match
      const columnValidation = await this.validateColumnsAgainstSchema(cleanSQL)
      warnings.push(...columnValidation.warnings)

      // Aplicar correções de Fuzzy Matching se houver
      cleanSQL = columnValidation.fixedSQL

      // Se houver erros intoleráveis (colunas que não conseguimos fixar)
      if (columnValidation.errors.length > 0) {
        errors.push(...columnValidation.errors)
        return { isValid: false, errors, warnings }
      }

      // 6. Adicionar proteções de segurança
      const protectedSQL = this.addSafetyProtections(cleanSQL)
      if (protectedSQL !== cleanSQL) {
        warnings.push('Adicionadas proteções de segurança (LIMIT)')
      }

      // 7. Validar palavras-chave perigosas
      const dangerousKeywords = this.checkDangerousKeywords(protectedSQL)
      if (dangerousKeywords.length > 0) {
        errors.push(`Palavras-chave não permitidas: ${dangerousKeywords.join(', ')}`)
      }

      // 8. Verificar tamanho da query
      if (protectedSQL.length > 5000) {
        warnings.push('Query muito longa, pode afetar performance')
      }

      return {
        isValid: errors.length === 0,
        sanitizedSQL: errors.length === 0 ? protectedSQL : undefined,
        errors,
        warnings
      }

    } catch (error) {
      console.error('❌ Erro na validação SQL:', error)
      return {
        isValid: false,
        errors: ['Erro interno na validação SQL'],
        warnings
      }
    }
  }

  private async validateColumnsAgainstSchema(sql: string): Promise<{
    errors: string[]
    warnings: string[]
    fixedSQL: string
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    let fixedSQL = sql

    try {
      // Obter schema completo
      const fullSchema = await this.schemaService.getSchemaForLLM('inep')
      if (!fullSchema || !fullSchema.tables) {
        warnings.push('Não foi possível validar colunas contra o schema')
        return { errors, warnings, fixedSQL }
      }

      // Criar mapa de tabelas e suas colunas
      const schemaMap = new Map<string, Set<string>>()
      const allValidColumns = new Set<string>() // Para validação sem alias
      for (const table of fullSchema.tables) {
        const tableName = table.name.toLowerCase()
        const columns = new Set<string>()

        if (Array.isArray(table.columns)) {
          for (const col of table.columns) {
            const colName = col.split(':')[0].toLowerCase()
            columns.add(colName)
            allValidColumns.add(colName)
          }
        }
        schemaMap.set(tableName, columns)
      }

      // Extrair aliases do SQL
      const aliasMap = new Map<string, string>() // alias -> tableName
      // Matchers aprimorados para suportar INNER JOIN, LEFT JOIN etc
      const aliasPattern = /(?:from|join)\s+(?:inep\.)?([a-z_][a-z0-9_]*)(?:\s+(?:as\s+)?([a-z_][a-z0-9_]*))?/gi
      let aliasMatch: RegExpExecArray | null
      while ((aliasMatch = aliasPattern.exec(sql)) !== null) {
        const tableName = aliasMatch[1].toLowerCase()
        const alias = aliasMatch[2] ? aliasMatch[2].toLowerCase() : tableName

        // Evitar palavras-chave como aliases (ex: ON, WHERE)
        const sqlKeywords = ['on', 'where', 'group', 'order', 'having', 'left', 'right', 'inner', 'outer', 'cross', 'limit']
        if (!sqlKeywords.includes(alias)) {
          aliasMap.set(alias, tableName)
        }
      }

      console.log('🔍 Aliases/Tabelas encontrados:', Object.fromEntries(aliasMap))

      // ======== FUZZY MATCH PARA ALIAS.COLUNA ========
      const columnReferences = sql.match(/\b([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)/gi) || []

      for (const ref of columnReferences) {
        const parts = ref.toLowerCase().split('.')
        if (parts.length !== 2) continue

        const [tableOrAlias, columnName] = parts.map(p => p.trim())
        const actualTableName = aliasMap.get(tableOrAlias) || tableOrAlias

        let columnExists = false
        let tableFound = false
        let availableCols: string[] = []

        for (const [tableName, columns] of schemaMap.entries()) {
          // Check exact match or suffix (for 'inep.' prefix)
          if (tableName === actualTableName || tableName.endsWith('_' + actualTableName) || tableName.endsWith(actualTableName)) {
            tableFound = true
            availableCols = Array.from(columns)
            if (columns.has(columnName)) {
              columnExists = true
              break
            }
          }
        }

        if (tableFound && !columnExists) {
          // Fuzzy match logic
          let bestMatch = ''
          let minDistance = 999
          for (const col of availableCols) {
            const dist = this.levenshteinDistance(columnName, col)
            // Weight substitution heavily if lengths are very different, but allow variations like co_ies vs cod_ies
            if (dist < minDistance && dist <= 3) {
              minDistance = dist
              bestMatch = col
            }
          }

          if (bestMatch && minDistance > 0) {
            console.log(`✨ Fuzzy Fix: Substituindo ${tableOrAlias}.${columnName} por ${tableOrAlias}.${bestMatch} (Distância: ${minDistance})`)
            // Substituição segura usando regex literal
            const regex = new RegExp(`\\b${tableOrAlias}\\s*\\.\\s*${columnName}\\b`, 'gi')
            fixedSQL = fixedSQL.replace(regex, `${tableOrAlias}.${bestMatch}`)
            warnings.push(`Auto-corrigido: coluna '${columnName}' para '${bestMatch}'.`)
          } else {
            console.log(`  ✗ Coluna não consertável e fatal: ${tableOrAlias}.${columnName}`)
            errors.push(`A coluna '${columnName}' não existe na tabela '${actualTableName}'. Tente uma destas: ${availableCols.slice(0, 5).join(', ')}.`)
          }
        }
      }

      // ======== FUZZY MATCH PARA COLUNAS SOLTAS (SEM ALIAS) ========
      // Extrai palavras soltas (ignora números, strings em aspas e palavras-chave SQL)
      const sqlKeywords = new Set(['select', 'from', 'where', 'and', 'or', 'in', 'not', 'null', 'is', 'join', 'inner', 'left', 'right', 'outer', 'on', 'group', 'by', 'order', 'having', 'limit', 'offset', 'as', 'count', 'sum', 'avg', 'max', 'min', 'distinct', 'case', 'when', 'then', 'else', 'end', 'like', 'ilike', 'between', 'asc', 'desc', 'true', 'false', 'inep', 'cast', 'coalesce']);

      // Removendo strings para não falsear colunas e depois pegando palavras
      const sqlNoStrings = fixedSQL.replace(/'[^']*'/g, '');
      const looseWordsMatch = sqlNoStrings.match(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g) || [];
      const checkedWords = new Set<string>();

      for (const wordStr of looseWordsMatch) {
        const word = wordStr.toLowerCase();
        if (sqlKeywords.has(word)) continue;
        if (aliasMap.has(word)) continue; // É um alias de tabela
        if (Array.from(schemaMap.keys()).some(t => t === word || t.endsWith('.' + word))) continue; // É nome de tabela
        if (checkedWords.has(word)) continue; // Já verificamos

        checkedWords.add(word);

        // Tem alguma tabela no FROM/JOIN que sabemos que está na query?
        let allPossibleColsForQuery: string[] = [];
        for (const [, tbl] of aliasMap.entries()) {
          for (const [schemaTbl, cols] of schemaMap.entries()) {
            if (schemaTbl === tbl || schemaTbl.endsWith(tbl)) {
              allPossibleColsForQuery.push(...Array.from(cols));
            }
          }
        }

        // Remover duplicatas
        allPossibleColsForQuery = [...new Set(allPossibleColsForQuery)];

        if (allPossibleColsForQuery.length > 0 && !allValidColumns.has(word)) {
          // A palavra não existe em nenhuma tabela do schema
          let bestMatch = '';
          let minDistance = 999;
          for (const col of allPossibleColsForQuery) {
            const dist = this.levenshteinDistance(word, col);
            if (dist < minDistance && dist <= 2) { // Distancia estrita para colunas soltas
              minDistance = dist;
              bestMatch = col;
            }
          }

          if (bestMatch && minDistance > 0 && word.length > 3) { // Não tenta fixar palavras mt curtas soltas
            console.log(`✨ Fuzzy Fix (Solto): Substituindo ${word} por ${bestMatch} (Distância: ${minDistance})`);
            const regex = new RegExp(`(?<!\\.)\\b${word}\\b(?!\\.)`, 'gi');
            fixedSQL = fixedSQL.replace(regex, bestMatch);
            warnings.push(`Auto-corrigido: coluna solta '${word}' para '${bestMatch}'.`);
          } else if (!bestMatch && word.length > 3) {
            // Nós não necessariamente geramos ERRO para colunas soltas não consoláveis pois podem ser 
            // variáveis do frontend ou partes de funções obscuras. Deixaremos como warning para não ser muito rígido,
            // ao contrário das que tem alias explícito.
            warnings.push(`Possível coluna desconhecida (solta): '${word}'.`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Erro ao validar colunas com schema:', error)
      warnings.push('Erro ao validar colunas contra schema (validação incompleta)')
    }

    return { errors, warnings, fixedSQL }
  }

  /**
   * Verifica se é uma query SELECT válida
   */
  private isValidSelectQuery(sql: string): boolean {
    const sqlLower = sql.toLowerCase().trim()

    // Deve começar com SELECT ou WITH (para CTEs)
    if (!sqlLower.startsWith('select') && !sqlLower.startsWith('with')) {
      return false
    }

    // Não deve conter comandos perigosos
    const dangerousCommands = [
      'insert', 'update', 'delete', 'drop', 'create', 'alter',
      'truncate', 'grant', 'revoke', 'exec', 'execute'
    ]

    return !dangerousCommands.some(cmd =>
      sqlLower.includes(cmd + ' ') || sqlLower.includes(cmd + '\n')
    )
  }

  /**
   * Valida prefixos de tabelas
   */
  private validateTablePrefixes(sql: string): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Procurar por referências de tabelas sem prefixo inep.
    const tableReferences = sql.match(/(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gi)

    if (tableReferences) {
      for (const ref of tableReferences) {
        const tableName = ref.split(/\s+/)[1]
        // Verificar se a tabela não tem prefixo inep. e não é um alias
        if (!tableName.startsWith('inep.') && !tableName.includes(' AS ') && tableName.length > 3) {
          warnings.push(`Tabela '${tableName}' deveria ter prefixo 'inep.'`)
        }
      }
    }

    return { isValid: true, errors, warnings }
  }

  /**
   * Adiciona proteções de segurança de forma inteligente
   */
  private addSafetyProtections(sql: string): string {
    let protectedSQL = sql.trim()

    // Verificar se já tem LIMIT
    if (protectedSQL.toLowerCase().includes('limit')) {
      return protectedSQL // Já tem LIMIT, não modificar
    }

    // Verificar se é uma consulta que não deve ter LIMIT adicionado automaticamente
    if (this.shouldSkipLimitProtection(protectedSQL)) {
      return protectedSQL
    }

    // Adicionar LIMIT de forma inteligente
    const limitValue = this.calculateOptimalLimit(protectedSQL)

    // Para consultas complexas, adicionar LIMIT de forma mais cuidadosa
    if (this.isComplexQuery(protectedSQL)) {
      return this.addLimitToComplexQuery(protectedSQL, limitValue)
    } else {
      // Para consultas simples, adicionar LIMIT no final
      return `${protectedSQL} LIMIT ${limitValue}`
    }
  }

  /**
   * Verifica se a consulta não deve ter LIMIT adicionado automaticamente
   */
  private shouldSkipLimitProtection(sql: string): boolean {
    const sqlLower = sql.toLowerCase()

    // Não adicionar LIMIT em consultas que já têm agregações que limitam resultados
    const skipPatterns = [
      /\bcount\s*\(/i,           // COUNT queries
      /\bsum\s*\(/i,             // SUM queries
      /\bavg\s*\(/i,             // AVG queries
      /\bmax\s*\(/i,             // MAX queries
      /\bmin\s*\(/i,             // MIN queries
      /\bgroup\s+by\b/i,         // GROUP BY queries
      /\bhaving\b/i,             // HAVING queries
      /\bunion\b/i,              // UNION queries
      /\bexcept\b/i,             // EXCEPT queries
      /\bintersect\b/i,          // INTERSECT queries
      /\bwindow\b/i,             // Window functions
      /\bover\s*\(/i,            // OVER clauses
      /\bpartition\s+by\b/i,     // PARTITION BY
      /\border\s+by\b.*\blimit\b/i, // ORDER BY ... LIMIT (já tem estrutura de paginação)
    ]

    return skipPatterns.some(pattern => pattern.test(sqlLower))
  }

  /**
   * Verifica se é uma consulta complexa que precisa de tratamento especial
   */
  private isComplexQuery(sql: string): boolean {
    const sqlLower = sql.toLowerCase()

    const complexPatterns = [
      /\bwith\b/i,               // CTEs (Common Table Expressions)
      /\bcase\s+when\b/i,        // CASE statements
      /\bexists\s*\(/i,          // EXISTS subqueries
      /\bnot\s+exists\s*\(/i,    // NOT EXISTS subqueries
      /\bin\s*\(\s*select\b/i,   // IN subqueries
      /\bnot\s+in\s*\(\s*select\b/i, // NOT IN subqueries
      /\bselect\b.*\bfrom\s*\(\s*select\b/i, // Nested SELECT
    ]

    return complexPatterns.some(pattern => pattern.test(sqlLower))
  }

  /**
   * Calcula o LIMIT ideal baseado na complexidade da consulta
   */
  private calculateOptimalLimit(sql: string): number {
    const sqlLower = sql.toLowerCase()

    // Contar JOINs
    const joinCount = (sqlLower.match(/\bjoin\b/g) || []).length

    // Verificar se tem subconsultas
    const subqueryCount = (sqlLower.match(/\(\s*select\b/g) || []).length

    // Calcular LIMIT baseado na complexidade
    if (joinCount > 3 || subqueryCount > 2) {
      return 25  // Consultas muito complexas
    } else if (joinCount > 1 || subqueryCount > 0) {
      return 50  // Consultas moderadamente complexas
    } else {
      return 100 // Consultas simples
    }
  }

  /**
   * Adiciona LIMIT a consultas complexas de forma inteligente
   */
  private addLimitToComplexQuery(sql: string, limitValue: number): string {
    const sqlLower = sql.toLowerCase()

    // Para CTEs (WITH), adicionar LIMIT na consulta principal
    if (sqlLower.startsWith('with')) {
      // Encontrar a última consulta SELECT (consulta principal)
      const lastSelectIndex = sql.lastIndexOf('SELECT')
      if (lastSelectIndex > 0) {
        // Verificar se já tem ORDER BY na consulta principal
        const afterLastSelect = sql.substring(lastSelectIndex)
        if (afterLastSelect.toLowerCase().includes('order by')) {
          // Adicionar LIMIT após ORDER BY
          return `${sql} LIMIT ${limitValue}`
        } else {
          // Adicionar LIMIT no final
          return `${sql} LIMIT ${limitValue}`
        }
      }
    }

    // Para outras consultas complexas, adicionar no final
    return `${sql} LIMIT ${limitValue}`
  }

  /**
   * Verifica palavras-chave perigosas
   */
  private checkDangerousKeywords(sql: string): string[] {
    const dangerous = [
      'xp_cmdshell', 'sp_configure', 'openrowset', 'opendatasource',
      'bulk insert', 'load_file', 'into outfile', 'into dumpfile'
    ]

    const sqlLower = sql.toLowerCase()
    return dangerous.filter(keyword => sqlLower.includes(keyword))
  }

  /**
   * Dicionário central de anotações de colunas para enriquecer o schema enviado ao LLM.
   * Inclui tipos, enums reais do banco e contexto de uso.
   */
  private buildSchemaColumnDict(): Record<string, string> {
    return {
      // Flags booleanas
      'in_capital':              '[int: 1=Capital, 0=Interior — em censo_ies]',
      'in_capital_ies':          '[int: 1=Capital, 0=Interior — em censo_ies_bruto]',
      'in_local_oferta':         '[int: 1=Sim, 0=Não]',
      // Categorias em censo_ies (lookup via cod_ies PK)
      'id_categoria_administrativa': '[int — em censo_ies: 1=Pública Federal, 2=Pública Estadual, 3=Municipal, 4=Privada c/fins lucrativos, 5=Privada s/fins lucrativos, 6=Privada Confessional, 7=Especial, 8=Comunitária]',
      'id_organizacao_academica':    '[int — em censo_ies: 1=Universidade, 2=Centro Universitário, 3=Faculdade, 4=Instituto Federal, 5=CEFET]',
      'id_grau_academico':           '[int — em censo_cursos: 1=Bacharelado, 2=Licenciatura, 3=Tecnológico, 4=Bacharelado+Licenciatura]',
      'id_modalidade_ensino':        '[int — em censo_cursos: 1=Presencial, 2=EAD]',
      // Categorias em censo_ies_bruto e censo_curso_vagas_bruto (sem JOIN extra)
      'tp_organizacao_academica':    '[int — em censo_ies_bruto: 1=Universidade, 2=Centro Universitário, 3=Faculdade, 4=Instituto Federal, 5=CEFET]',
      'tp_categoria_administrativa': '[int — em censo_ies_bruto/vagas_bruto: 1=Federal, 2=Estadual, 3=Municipal, 4=Privada c/lucro, 5=Privada s/lucro, 6=Confessional, 7=Especial, 8=Comunitária]',
      'tp_modalidade_ensino':        '[int — em censo_curso_vagas_bruto: 1=Presencial, 2=EAD]',
      'tp_grau_academico':           '[varchar — em censo_curso_vagas_bruto: 1=Bacharelado, 2=Licenciatura, 3=Tecnológico]',
      // IDs de IES (atenção: nomes diferentes por tabela!)
      'cod_ies':  '[int PK — em censo_ies e censo_cursos]',
      'co_ies':   '[int — em emec_instituicoes, censo_curso_vagas_bruto, censo_ies_bruto, dados_cpc, fluxo_tda, dados_igc — NÃO é PK]',
      // Fatos anuais (SOMENTE em censo_curso_vagas_bruto)
      'nu_ano_censo':  '[int — ano do censo, range 2010–2023 — em censo_curso_vagas_bruto e censo_ies_bruto — NO JOIN entre elas: v.nu_ano_censo = b.nu_ano_censo é OBRIGATÓRIO]',
      'qt_mat':        '[int — matrículas totais — SOMENTE em censo_curso_vagas_bruto]',
      'qt_mat_fem':    '[int — matrículas femininas — em censo_curso_vagas_bruto]',
      'qt_mat_masc':   '[int — matrículas masculinas — em censo_curso_vagas_bruto]',
      'qt_ing':        '[int — ingressantes — SOMENTE em censo_curso_vagas_bruto]',
      'qt_vg_total':   '[int — vagas totais — SOMENTE em censo_curso_vagas_bruto]',
      'qt_conc':       '[int — concluintes — em censo_curso_vagas_bruto]',
      // Taxas de fluxo (fluxo_tda) — valores entre 0 e 1
      'tda':  '[numeric 0–1 — Taxa de Desistência Acumulada — em fluxo_tda]',
      'tca':  '[numeric 0–1 — Taxa de Conclusão Acumulada — em fluxo_tda]',
      'tap':  '[numeric 0–1 — Taxa de Permanência Acumulada — em fluxo_tda]',
      'tcan': '[numeric 0–1 — Taxa de Conclusão Acumulada Normalizada — em fluxo_tda]',
      'tada': '[numeric 0–1 — Taxa de Desistência Acumulada — em fluxo_tda]',
      // Modalidade em fluxo_tda
      'co_modalidade': '[int — em fluxo_tda: 1=Presencial, 2=EAD]',
      // Indicadores de qualidade
      'cpc_faixa':      '[int — em dados_cpc: 1=Muito Fraco, 2=Fraco, 3=Regular, 4=Bom, 5=Muito Bom]',
      'cpc_continuo':   '[numeric 0–5 — nota CPC contínua — em dados_cpc]',
      'enade_continuo': '[numeric 0–5 — nota ENADE — em dados_cpc]',
      'enade_faixa':    '[int — em dados_cpc: 1=Muito Fraco, 2=Fraco, 3=Regular, 4=Bom, 5=Muito Bom]',
      'igc_faixa':      '[int — em dados_igc: 1=Muito Fraco, 2=Fraco, 3=Regular, 4=Bom, 5=Muito Bom]',
      'igc_continuo':   '[numeric 0–5 — IGC contínuo — em dados_igc]',
      // uf_ibge — pertence ao schema cesta (SEMPRE use cesta.uf_ibge)
      'co_uf_ibge':  '[int PK — em cesta.uf_ibge — FK de mesoregioes_ibge.cod_uf_ibge]',
      'no_uf_ibge':  '[varchar — nome do estado — em cesta.uf_ibge — ex: "São Paulo", "Rio Grande do Sul"]',
      'sg_uf_ibge':  '[char(2) — sigla do estado — em cesta.uf_ibge — ex: "SP", "RS"]',
      'cod_uf_ibge': '[int — FK em mesoregioes_ibge → cesta.uf_ibge.co_uf_ibge]',
      // Tipos de dados importantes para joins (character vs int)
      'cod_municipio':        '[character — em censo_ies e municipios_ibge — use aspas simples em comparações]',
      'co_municipio_ies':     '[int — em censo_ies_bruto — para JOIN com municipios_ibge use cast: co_municipio_ies::text = municipios_ibge.cod_ibge]',
      'cod_ibge':             '[character PK — em municipios_ibge — use aspas simples]',
      'cod_microregiao_ibge': '[character — join entre municipios_ibge e microregioes_ibge]',
      // CAPES pós-graduação
      'an_base':             '[int — ano base — em capes_programas_bruto, range 2013–2022]',
      'cd_nivel_formacao':   '[char — em capes_programas_bruto: M=Mestrado, D=Doutorado, F=Mestrado Profissional]',
      'nm_grau_academico':   '[varchar — em capes_programas_bruto: "MESTRADO", "DOUTORADO", "MESTRADO PROFISSIONAL"]',
      // IBGE socioeconômico (schema cesta)
      'cod_ibge_mun':  '[character — em idhms e pibs_per_capita — equivale a municipios_ibge.cod_ibge]',
    }
  }

  /**
   * Formata uma coluna do schema JSON para exibição no prompt.
   * Mantém tipo de dado e marca PKs. Adiciona anotação do dicionário se disponível.
   * Formato do JSON: "col_name:type" ou "col_name:type!*" (PK)
   */
  private formatColumnForPrompt(col: string, dictionary: Record<string, string>): string {
    const colonIdx = col.indexOf(':')
    if (colonIdx === -1) {
      return dictionary[col] ? `${col} ${dictionary[col]}` : col
    }

    const colName = col.substring(0, colonIdx)
    const typeRaw = col.substring(colonIdx + 1)
    const isPK = typeRaw.includes('!*')
    const type = typeRaw.replace('!*', '').replace('!', '').trim()

    // Dicionário tem anotação própria que já inclui tipo e contexto — usar ele
    if (dictionary[colName]) {
      return `${colName} ${dictionary[colName]}`
    }

    // Sem anotação: mostrar tipo compacto e PK
    let result = colName
    if (type) result += `:${type}`
    if (isPK) result += '(PK)'
    return result
  }

  /**
   * Seção estática de relacionamentos entre tabelas (JOINs corretos).
   * Gerada a partir de análise real do banco — não há FK constraints definidos,
   * mas estas são as relações corretas por convenção de negócio.
   */
  private buildJoinRelationships(): string {
    return `
📎 RELACIONAMENTOS / JOINs CORRETOS:
- censo_cursos.cod_ies = emec_instituicoes.co_ies
- censo_cursos.cod_curso = censo_curso_vagas_bruto.co_curso
- censo_curso_vagas_bruto.co_ies = censo_ies_bruto.co_ies  AND v.nu_ano_censo = b.nu_ano_censo  (JOIN TEMPORAL OBRIGATÓRIO)
- censo_ies.cod_municipio = municipios_ibge.cod_ibge  (ambos character — sem cast)
- censo_ies_bruto.co_municipio_ies::text = municipios_ibge.cod_ibge  (co_municipio_ies é int, cast para text necessário)
- municipios_ibge.cod_microregiao_ibge = microregioes_ibge.cod_microregiao_ibge
- microregioes_ibge.cod_mesoregiao_ibge = mesoregioes_ibge.cod_mesoregiao_ibge
- mesoregioes_ibge.cod_uf_ibge = cesta.uf_ibge.co_uf_ibge
- cesta.uf_ibge.co_regiao_ibge = regioes_ibge.cod_regiao_ibge
- dados_cpc.co_ies = censo_ies_bruto.co_ies  |  dados_cpc.co_curso = censo_cursos.cod_curso
- dados_igc.co_ies = emec_instituicoes.co_ies
- igc_bruto.cod_ies = censo_ies_bruto.co_ies  (NOTE: igc_bruto tem 'cod_ies', censo_ies_bruto tem 'co_ies')
- fluxo_tda.co_ies = censo_ies_bruto.co_ies  |  fluxo_tda.co_curso = censo_cursos.cod_curso
- municipios_ibge.cod_ibge = idhms.cod_ibge
- municipios_ibge.cod_ibge = pibs_per_capita.cod_ibge`
  }

  /**
   * Classifica erros PostgreSQL para direcionar a correção automática.
   */
  private classifyPostgresError(error: string, sql?: string): { type: string; hint: string } {
    const lower = error.toLowerCase()

    if (lower.includes('column') && lower.includes('does not exist')) {
      const colMatch = error.match(/column "?([^"\s]+)"? /)
      const tblMatch = error.match(/table "?([^"\s]+)"?/)
      const col = colMatch?.[1] || 'desconhecida'
      const tbl = tblMatch?.[1] || ''
      return {
        type: 'column_not_found',
        hint: `❌ COLUNA "${col}" NÃO EXISTE${tbl ? ` na tabela "${tbl}"` : ''}. Verifique o schema acima e use EXATAMENTE o nome listado. Atenção: 'cod_ies' existe em censo_ies/censo_cursos; 'co_ies' existe em emec_instituicoes/censo_ies_bruto/dados_cpc — são colunas diferentes.`
      }
    }

    if (lower.includes('relation') && lower.includes('does not exist')) {
      const tblMatch = error.match(/relation "?([^"\s"]+)"?/)
      const tbl = tblMatch?.[1] || 'desconhecida'
      return {
        type: 'table_not_found',
        hint: `❌ TABELA "${tbl}" NÃO EXISTE. Use apenas as tabelas do schema fornecido. Verifique o prefixo: a maioria usa 'inep.', mas uf_ibge usa 'cesta.uf_ibge'.`
      }
    }

    if (lower.includes('ambiguous')) {
      const colMatch = error.match(/column reference "([^"]+)"/)
      const col = colMatch?.[1] || ''
      return {
        type: 'ambiguous_column',
        hint: `❌ COLUNA AMBÍGUA: "${col}" existe em mais de uma tabela do JOIN. Use sempre o alias da tabela: ex. alias.${col || 'coluna'}.`
      }
    }

    if (lower.includes('operator does not exist') || lower.includes('cannot cast') || lower.includes('invalid input syntax for type')) {
      return {
        type: 'type_mismatch',
        hint: `❌ TIPO DE DADO INCOMPATÍVEL. Possíveis causas: (1) comparando int com varchar sem cast — lembre que cod_municipio e cod_ibge são character, use aspas simples: cod_municipio = '123456'; (2) tp_grau_academico em fluxo_tda é varchar, não int.`
      }
    }

    if (lower.includes('syntax error') || lower.includes('parse error')) {
      return {
        type: 'syntax_error',
        hint: `❌ ERRO DE SINTAXE. Verifique: parênteses balanceados, vírgulas corretas, sem ponto-e-vírgula no final, e que o bloco SQL está completo.`
      }
    }

    if (lower.includes('timeout') || lower.includes('canceling statement') || lower.includes('statement canceled')) {
      const hasBothTemporalTables = sql
        ? (/censo_ies_bruto/i.test(sql) && /censo_curso_vagas_bruto/i.test(sql))
        : false
      if (hasBothTemporalTables) {
        return {
          type: 'temporal_join_missing',
          hint: `🚨 TIMEOUT CAUSADO POR JOIN SEM FILTRO DE ANO. O JOIN entre censo_ies_bruto e censo_curso_vagas_bruto sem a condição de ano produz produto cartesiano de ~8,7 MILHÕES de linhas → timeout e valores 14× inflados.
CORRIJA obrigatoriamente: adicione AND v.nu_ano_censo = b.nu_ano_censo na cláusula ON do JOIN.
ERRADO:  JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies
CORRETO: JOIN inep.censo_ies_bruto b ON v.co_ies = b.co_ies AND v.nu_ano_censo = b.nu_ano_censo`
        }
      }
      return {
        type: 'timeout',
        hint: `❌ TIMEOUT: A query demorou mais de 45s. Verifique: (1) JOINs sem condição de ano entre tabelas temporais, (2) ausência de LIMIT, (3) produto cartesiano acidental entre tabelas grandes.`
      }
    }

    return { type: 'other', hint: `Analise o erro e corrija o problema identificado.` }
  }
}
