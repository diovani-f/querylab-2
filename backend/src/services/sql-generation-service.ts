import { LLMService } from './llm-service'
import { CloudflareAIService } from './cloudflare-ai-service'
import { SchemaDiscoveryService } from './schema-discovery-service'
import { GroqService } from './groq-service'
import { QueryExecutionService } from './query-execution-service'

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
  provider: 'gemini' | 'groq' | 'cloudflare'
  model: string
  success: boolean
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
  private groqService?: GroqService

  private constructor() {
    this.llmService = LLMService.getInstance()
    this.cloudflareAI = CloudflareAIService.getInstance()
    this.schemaService = SchemaDiscoveryService.getInstance()
    this.queryExecutionService = QueryExecutionService.getInstance()

    // Inicializar Groq para resumos (opcional)
    try {
      this.groqService = GroqService.getInstance()
      console.log('✅ Groq inicializado no SQLGenerationService')
    } catch (error) {
      console.warn('⚠️ Groq não disponível no SQLGenerationService - usando LLMService como fallback')
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

      // 4. Gerar explicação
      const explanation = await this.generateExplanation(
        request.question,
        validationResult.sanitizedSQL!
      )

      return {
        success: true,
        sql: validationResult.sanitizedSQL!,
        explanation,
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
          provider: 'cloudflare',
          model: 'sqlcoder-7b-2',
          success: false,
          status: 'pending',
          processingTime: 0
        }
      ]

      // 3. Gerar SQL em paralelo com Promise.allSettled
      const promises = [
        this.generateWithGemini(request.question, schemaResult.reducedSchema!, conversationContext),
        this.generateWithGroq(request.question, schemaResult.reducedSchema!, conversationContext),
        this.generateWithCloudflare(request.question, schemaResult.reducedSchema!, conversationContext)
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
          const execResult = await this.queryExecutionService.executeWithTimeout(
            result.sql,
            { timeoutMs: 10000 } // 10 segundos de timeout
          )

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
  private async getReducedSchema(_question?: string): Promise<{
    success: boolean
    reducedSchema?: string
    error?: string
  }> {
    try {
      console.log('📊 Obtendo schema compacto...')

      // Obter schema completo
      const fullSchema = await this.schemaService.getSchemaForLLM('inep')

      if (!fullSchema || !fullSchema.tables || fullSchema.tables.length === 0) {
        return {
          success: false,
          error: 'Schema do banco não encontrado'
        }
      }

      console.log(`✅ Schema obtido: ${fullSchema.tables.length} tabelas`)

      // Criar versão compacta do schema (apenas nome e colunas)
      const compactSchema = {
        schema: 'inep',
        tables: fullSchema.tables.map((table: any) => ({
          name: table.name,
          columns: table.columns || []
        }))
      }

      const schemaStr = JSON.stringify(compactSchema, null, 2)
      console.log(`📏 Tamanho do schema: ${(schemaStr.length / 1024).toFixed(1)}KB`)

      return {
        success: true,
        reducedSchema: schemaStr
      }

    } catch (error) {
      console.error('❌ Erro ao obter schema:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar schema'
      }
    }
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
    error?: string
  }> {
    try {
      // Construir contexto da conversa
      const conversationContext = this.buildConversationContext(conversationHistory)

      if (model === 'cloudflare-sqlcoder-7b-2') {
        return await this.generateWithCloudflareSimple(question, reducedSchema, conversationContext)
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
   * Gera SQL usando Cloudflare AI (versão para paralelismo)
   */
  private async generateWithCloudflare(
    question: string,
    reducedSchema: string,
    conversationContext: string = ""
  ): Promise<ParallelSQLResult> {
    const startTime = Date.now()

    try {
      // Usar o método processSQL otimizado do CloudflareAI que usa Gemini para otimizar o prompt
      const result = await this.cloudflareAI.processSQL(question, reducedSchema, conversationContext)

      if (!result.success) {
        return {
          provider: 'cloudflare',
          model: 'sqlcoder-7b-2',
          success: false,
          status: 'error',
          error: result.error,
          processingTime: Date.now() - startTime
        }
      }

      const sql = result.sql!

      // Validar SQL
      const validation = await this.validateAndSanitizeSQL(sql)

      if (!validation.isValid) {
        return {
          provider: 'cloudflare',
          model: 'sqlcoder-7b-2',
          success: false,
          status: 'error',
          error: `SQL inválido: ${validation.errors.join(', ')}`,
          processingTime: Date.now() - startTime
        }
      }

      // Gerar explicação
      const explanation = await this.generateExplanation(question, validation.sanitizedSQL!)

      return {
        provider: 'cloudflare',
        model: 'sqlcoder-7b-2',
        success: true,
        status: 'complete',
        sql: validation.sanitizedSQL!,
        explanation,
        validationWarnings: validation.warnings,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        provider: 'cloudflare',
        model: 'sqlcoder-7b-2',
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Gera SQL usando Cloudflare AI (versão legada para compatibilidade)
   */
  private async generateWithCloudflareSimple(
    question: string,
    reducedSchema: string,
    conversationContext: string = ""
  ): Promise<{
    success: boolean
    sql?: string
    error?: string
  }> {
    const result = await this.generateWithCloudflare(question, reducedSchema, conversationContext)
    return {
      success: result.success,
      sql: result.sql,
      error: result.error
    }
  }

  /**
   * Constrói o prompt otimizado unificado usando técnica de Chain of Thought
   */
  private buildSQLGenerationPrompt(
    question: string,
    reducedSchema: string,
    conversationContext: string = ""
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
   - ✅ **USE \`CENSO_IES\` (Principal)**: Para a maioria dos casos. Use para filtragem por capitais (\`in_capital\`), categoria administrativa, organização acadêmica e cruzamentos com geografia.
     * Esta tabela cruza com geografia usando: \`censo_ies.cod_municipio = municipios_ibge.cod_ibge\`
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
     me.cod_uf_ibge = u.uf_ibge
     u.cod_regiao_ibge = r.cod_regiao_ibge
     \`\`\`

3. **RESTRIÇÕES DE COLUNAS (NÃO INVENTE ESTAS COLUNAS)**:
   - ❌ NUNCA USE: \`municipios_ibge.cod_uf_ibge\` (Siga a cadeia mostrada acima).
   - ❌ NUNCA USE: \`censo_ies.cod_categoria_administrativa\` (O nome correto no schema é \`id_categoria_administrativa\`).
   - ❌ NUNCA USE: \`uf_ibge.nome_uf\` ou \`uf_ibge.sigla_uf\` (O nome correto é \`nome_uf_ibge\` e o código/sigla é \`uf_ibge\`).
   - ❌ NUNCA USE: \`emec_instituicoes.in_capital\` (Só existe na \`censo_ies\`).
   - Use os tipos de dados originais. Para strings, sempre utilize \`ILIKE\` em buscas textuais para ser case-insensitive.

4. **PREFIXO DE SCHEMA GERAL**:
   - SEMPRE adicione o prefixo \`inep.\` em todas as tabelas no \`FROM\` e \`JOIN\`. (Ex: \`FROM inep.censo_ies\`).

5. **PERFORMANCE**:
   - Sempre limite os resultados: \`LIMIT 50\` em queries com JOINs abertos, ou \`LIMIT 100\` em consultas simples.

💡 EXEMPLOS PRÁTICOS ESPERADOS:
Exemplo 1 (Uso correto da censo_ies para capitais):
\`\`\`sql
SELECT COUNT(*) FROM inep.censo_ies WHERE in_capital = 1
\`\`\`
Exemplo 2 (Uso obrigatório da emec_instituicoes para contatos):
\`\`\`sql
SELECT no_ies, telefone, email FROM inep.emec_instituicoes WHERE no_ies ILIKE '%Pernambuco%' LIMIT 50
\`\`\`
Exemplo 3 (Cadeia geográfica completa):
\`\`\`sql
SELECT r.descr_regiao_ibge AS regiao, COUNT(DISTINCT c.cod_ies) AS total_instituicoes
FROM inep.censo_ies c
JOIN inep.municipios_ibge m ON c.cod_municipio = m.cod_ibge
JOIN inep.microregioes_ibge mi ON m.cod_microregiao_ibge = mi.cod_microregiao_ibge
JOIN inep.mesoregioes_ibge me ON mi.cod_mesoregiao_ibge = me.cod_mesoregiao_ibge
JOIN inep.uf_ibge u ON me.cod_uf_ibge = u.uf_ibge
JOIN inep.regioes_ibge r ON u.cod_regiao_ibge = r.cod_regiao_ibge
WHERE r.descr_regiao_ibge ILIKE 'Nordeste'
GROUP BY r.descr_regiao_ibge
\`\`\`

🧠 SUA TAREFA (CHAIN OF THOUGHT):
1. Primeiro, pense passo-a-passo. Escreva um parágrafo conciso explicando qual intenção você entendeu, quais tabelas serão escolhidas e por que, baseado nas regras.
2. Em seguida, dê a resposta final em formato SQL padrão isolado por \`\`\`sql. Não coloque \`;\` após a query, não adicione comentários adicionais dentro do bloco da query.`;
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

    const sql = this.extractSQL(result.content || '')
    return {
      success: true,
      sql
    }
  }

  /**
   * Extrai SQL da resposta (método unificado)
   */
  private extractSQL(response: string): string {
    // Usar o método já testado do CloudflareAI
    return this.cloudflareAI.extractSQL(response)
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

      // Gerar explicação
      const explanation = await this.generateExplanation(question, validation.sanitizedSQL!)

      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        success: true,
        status: 'complete',
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
      const prompt = this.buildSQLGenerationPrompt(question, reducedSchema, conversationContext)

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

      // Gerar explicação
      const explanation = await this.generateExplanation(question, validation.sanitizedSQL!)

      return {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        success: true,
        status: 'complete',
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
   * Gera explicação da query usando Groq preferencialmente
   */
  private async generateExplanation(question: string, sql: string): Promise<string> {
    try {
      // Tentar usar Groq primeiro (otimizado para resumos)
      if (this.groqService) {
        console.log('🔄 Gerando explicação SQL com Groq...')
        const groqResponse = await this.groqService.generateSQLSummary({
          question,
          sql
        })

        if (groqResponse.success && groqResponse.content) {
          console.log('✅ Explicação SQL gerada com Groq')
          return groqResponse.content.trim()
        }
      }

      // Fallback para LLMService (que usa Gemini)
      console.log('🔄 Gerando explicação SQL com LLMService (fallback)...')
      return await this.llmService.generateQueryExplanation({
        prompt: question,
        sql
      })
    } catch (error) {
      console.error('❌ Erro ao gerar explicação:', error)
      return 'Explicação não disponível'
    }
  }

  /**
   * Valida e sanitiza SQL de forma robusta
   */
  private async validateAndSanitizeSQL(sql: string): Promise<SQLValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 1. Limpar SQL básico
      let cleanSQL = sql.trim()

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

      // 5. Validar colunas contra o schema
      // TEMPORARIAMENTE DESABILITADO - validação está com bug
      // const columnValidation = await this.validateColumnsAgainstSchema(cleanSQL)
      // if (columnValidation.errors.length > 0) {
      //   errors.push(...columnValidation.errors)
      // }
      // warnings.push(...columnValidation.warnings)
      warnings.push('Validação de colunas temporariamente desabilitada')

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

  /**
   * Valida se as colunas usadas no SQL existem no schema
   */
  private async validateColumnsAgainstSchema(sql: string): Promise<{
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Obter schema completo
      const fullSchema = await this.schemaService.getSchemaForLLM('inep')
      if (!fullSchema || !fullSchema.tables) {
        warnings.push('Não foi possível validar colunas contra o schema')
        return { errors, warnings }
      }

      // Criar mapa de tabelas e suas colunas
      const schemaMap = new Map<string, Set<string>>()
      for (const table of fullSchema.tables) {
        const tableName = table.name.toLowerCase()
        const columns = new Set<string>()

        if (Array.isArray(table.columns)) {
          for (const col of table.columns) {
            // Formato: "nome_coluna:tipo" ou "nome_coluna:tipo!*"
            const colName = col.split(':')[0].toLowerCase()
            columns.add(colName)
          }
        }

        schemaMap.set(tableName, columns)
      }

      // Extrair aliases do SQL (FROM/JOIN tabela AS alias ou FROM/JOIN tabela alias)
      const aliasMap = new Map<string, string>() // alias -> tableName
      const aliasPattern = /(?:from|join)\s+(?:inep\.)?([a-z_][a-z0-9_]*)\s+(?:as\s+)?([a-z_][a-z0-9_]*)/gi
      let aliasMatch: RegExpExecArray | null
      while ((aliasMatch = aliasPattern.exec(sql)) !== null) {
        const tableName = aliasMatch[1].toLowerCase()
        const alias = aliasMatch[2].toLowerCase()
        // Só adicionar se o alias for diferente do nome da tabela
        if (alias !== tableName && alias.length <= 3) { // Aliases geralmente são curtos
          aliasMap.set(alias, tableName)
        }
      }

      console.log('🔍 Aliases encontrados:', Object.fromEntries(aliasMap))
      console.log('🔍 Tabelas no schema:', Array.from(schemaMap.keys()).slice(0, 10))

      // Extrair referências de colunas do SQL
      // Padrão: tabela.coluna ou alias.coluna
      const columnReferences = sql.match(/\b([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)/gi) || []

      console.log('🔍 Referências de colunas encontradas:', columnReferences)

      const invalidColumns: string[] = []

      for (const ref of columnReferences) {
        const parts = ref.toLowerCase().split('.')
        if (parts.length !== 2) continue

        const [tableOrAlias, columnName] = parts.map(p => p.trim())

        // Resolver alias para nome real da tabela
        const actualTableName = aliasMap.get(tableOrAlias) || tableOrAlias

        console.log(`🔍 Validando ${tableOrAlias}.${columnName} (tabela real: ${actualTableName})`)

        // Procurar a tabela no schema
        let found = false

        for (const [tableName, columns] of schemaMap.entries()) {
          // Verificar se é a tabela exata ou se o nome da tabela termina com o nome procurado
          // (para lidar com prefixo inep.)
          if (tableName === actualTableName || tableName.endsWith('_' + actualTableName) || tableName.endsWith(actualTableName)) {
            console.log(`  ✓ Tabela encontrada: ${tableName}, verificando coluna ${columnName}...`)
            if (columns.has(columnName)) {
              console.log(`  ✓ Coluna ${columnName} existe!`)
              found = true
              break
            } else {
              // Coluna não existe nesta tabela
              const availableCols = Array.from(columns)
              console.log(`  ✗ Coluna ${columnName} NÃO existe. Disponíveis:`, availableCols.slice(0, 10))
              invalidColumns.push(`${tableOrAlias}.${columnName} (tabela: ${tableName}, colunas disponíveis: ${availableCols.slice(0, 10).join(', ')})`)
              found = true // Marcar como "encontrado" para não procurar em outras tabelas
              break
            }
          }
        }

        if (!found) {
          console.log(`  ✗ Tabela ${actualTableName} não encontrada no schema`)
          invalidColumns.push(`${tableOrAlias}.${columnName} (tabela não encontrada no schema)`)
        }
      }

      if (invalidColumns.length > 0) {
        errors.push(`Colunas não encontradas no schema: ${invalidColumns.join('; ')}`)
      }

    } catch (error) {
      console.error('❌ Erro ao validar colunas:', error)
      warnings.push('Erro ao validar colunas contra schema')
    }

    return { errors, warnings }
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
}
