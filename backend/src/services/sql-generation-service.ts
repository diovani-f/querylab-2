import { LLMService } from './llm-service'
import { CloudflareAIService } from './cloudflare-ai-service'
import { SchemaDiscoveryService } from './schema-discovery-service'
import { GroqService } from './groq-service'
import { QueryExecutionService } from './query-execution-service'
import { SmartSchemaReducer } from './smart-schema-reducer'

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
          const recommendedTimeout = this.queryExecutionService.getRecommendedTimeout(result.sql)
          let execResult = await this.queryExecutionService.executeWithTimeout(
            result.sql,
            { timeoutMs: recommendedTimeout } // Timeout dinâmico baseado na complexidade
          )

          // -------- AUTO-CORRECTION LOOP (1 round MAX) --------
          if (!execResult.success && execResult.error && schemaResult.reducedSchema) {
            console.log(`⚠️ Execução falhou para ${result.provider}. Tentando auto-correção 1x... Erro: ${execResult.error}`)

            const correctionResult = await this.retrySQLGeneration(
              result.provider,
              result.model,
              request.question,
              result.sql,
              execResult.error,
              schemaResult.reducedSchema,
              conversationContext
            )

            if (correctionResult.success && correctionResult.sql) {
              console.log(`✨ Auto-correção bem sucedida para ${result.provider}! Re-executando...`)
              result.sql = correctionResult.sql
              result.prompt = (result.prompt || '') + '\n\n[Auto-Correção Aplicada]'

              // Executar a nova query com timeout atualizado
              const newTimeout = this.queryExecutionService.getRecommendedTimeout(result.sql)
              execResult = await this.queryExecutionService.executeWithTimeout(
                result.sql,
                { timeoutMs: newTimeout }
              )
            } else {
              console.log(`❌ Auto-correção falhou para ${result.provider}.`)
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
        console.log('🧠 Utilizando SmartSchemaReducer baseado na pergunta...')
        const reductionResult = await this.schemaReducer.reduceSchema({
          question,
          schemaName: 'inep',
          maxTables: 15,
          includeRelationships: false
        })

        if (reductionResult.success && reductionResult.reducedSchema) {
          console.log(`✅ Schema reduzido com sucesso! Tabelas selecionadas: ${reductionResult.selectedTables?.length}`)

          const parsedSchema = JSON.parse(reductionResult.reducedSchema)

          const dictionary: Record<string, string> = {
            'in_capital': '(1=Capital, 0=Interior)',
            'id_categoria_administrativa': '(1=Pública Federal, 2=Pública Estadual, 3=Municipal, 4=Privada Lucros, 5=Privada sem lucros)',
            'id_organizacao_academica': '(1=Universidade, 2=Centro Universitário, 3=Faculdade)',
            'tp_modalidade_ensino': '(1=Presencial, 2=EAD)',
            'in_local_oferta': '(1=Sim, 0=Não)',
            'cod_ies': '(Código principal de instituição. Na censo_ies é cod_ies, na emec_instituicoes é co_ies. NUNCA invente codigo_ies)'
          }

          const lines: string[] = []
          lines.push('SCHEMA: inep')

          if (parsedSchema.tables && Array.isArray(parsedSchema.tables)) {
            parsedSchema.tables.forEach((table: any) => {
              // Filtrar e enriquecer colunas
              const enrichedCols = (table.columns || []).map((col: string) => {
                const colName = col.split(':')[0]
                if (dictionary[colName]) {
                  return `${colName} ${dictionary[colName]}`
                }
                return colName
              })

              const colsStr = enrichedCols.join(', ')
              lines.push(`Tabela \`inep.${table.name}\`: Colunas [ ${colsStr} ]`)
            })
          }

          const schemaStr = lines.join('\n')
          console.log(`📏 Tamanho do schema reduzido em texto: ${(schemaStr.length / 1024).toFixed(1)}KB`)

          return {
            success: true,
            reducedSchema: schemaStr
          }
        } else {
          console.warn(`⚠️ SmartSchemaReducer falhou: ${reductionResult.error}, fazendo fallback para schema completo`)
        }
      }

      // Obter schema completo (fallback)
      const fullSchema = await this.schemaService.getSchemaForLLM('inep')

      if (!fullSchema || !fullSchema.tables || fullSchema.tables.length === 0) {
        return {
          success: false,
          error: 'Schema do banco não encontrado'
        }
      }

      console.log(`✅ Schema inteiro obtido: ${fullSchema.tables.length} tabelas`)

      // Criar versão compacta em texto (DDL-like) para otimizar tokens e reduzir alucinações
      // Dicionário essencial
      const dictionary: Record<string, string> = {
        'in_capital': '(1=Capital, 0=Interior)',
        'id_categoria_administrativa': '(1=Pública Federal, 2=Pública Estadual, 3=Municipal, 4=Privada com lucros, 5=Privada sem lucros)',
        'id_organizacao_academica': '(1=Universidade, 2=Centro Universitário, 3=Faculdade)',
        'tp_modalidade_ensino': '(1=Presencial, 2=EAD)'
      }

      const lines: string[] = []
      lines.push('SCHEMA: inep')
      fullSchema.tables.forEach((table: any) => {
        const enrichedCols = (table.columns || []).map((colStr: string) => {
          const col = colStr.split(':')[0]
          return dictionary[col] ? `${col} ${dictionary[col]}` : col
        })
        lines.push(`Tabela \`inep.${table.name}\`: Colunas [ ${enrichedCols.join(', ')} ]`)
      })

      const schemaStr = lines.join('\n')
      console.log(`📏 Tamanho do schema inteiro em texto: ${(schemaStr.length / 1024).toFixed(1)}KB`)

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
        prompt: result.prompt,
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

3. **RESTRIÇÕES DE COLUNAS (ALUCINAÇÃO É ESTRITAMENTE PROIBIDA)**:
   - 🚨 CRÍTICO: USE EXATAMENTE E APENAS AS COLUNAS LISTADAS NO SCHEMA ACIMA.
   - ❌ NUNCA INVENTE NOMES DE COLUNAS. Por exemplo, se no schema está \`cod_curso\`, não invente e não escreva \`co_curso\`.
   - ❌ ATENÇÃO ESPECIAL: Na tabela \`censo_ies\` e \`censo_cursos\`, a coluna de código da IES é SECAMENTE \`cod_ies\`, NUNCA \`co_ies\`. Na tabela \`emec_instituicoes\` é \`co_ies\`. O banco de dados vai FALHAR se você errar isso.
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
${this.getDynamicExamples(question)}

🧠 SUA TAREFA (CHAIN OF THOUGHT):
1. Primeiro, pense passo-a-passo. Escreva um parágrafo conciso explicando qual intenção você entendeu, quais tabelas serão escolhidas e por que.
2. Liste explicitamente as colunas que você vai usar e confirme visualmente que elas **existem** no schema fornecido acima. NUNCA invente colunas como 'co_municipio' ou 'nome_uf', sempre cheque os nomes corretos.
3. Em seguida, dê a resposta final em formato SQL padrão isolado por \`\`\`sql. Não coloque \`;\` após a query, não adicione comentários adicionais dentro do bloco da query.`;
  }

  /**
   * Seleciona os melhores exemplos (Few-Shot Dinâmico) baseado em palavras-chave
   */
  private getDynamicExamples(question: string): string {
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
        tags: ['contato', 'telefone', 'email', 'site', 'telefone'],
        text: `Exemplo (Uso obrigatório da emec_instituicoes para contatos):
\`\`\`sql
SELECT no_ies, telefone, email FROM inep.emec_instituicoes WHERE no_ies ILIKE '%Pernambuco%' LIMIT 50
\`\`\``
      },
      {
        tags: ['regiao', 'nordeste', 'sul', 'sudeste', 'norte', 'centro-oeste', 'estado'],
        text: `Exemplo (Cadeia geográfica Obrigatoria):
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
\`\`\``
      },
      {
        tags: ['curso', 'medicina', 'direito', 'engenharia'],
        text: `Exemplo (Cruzamento entre cursos e instituicoes):
\`\`\`sql
SELECT c.nome_curso, e.site 
FROM inep.censo_cursos c
JOIN inep.emec_instituicoes e ON c.cod_ies = e.co_ies
WHERE c.nome_curso ILIKE '%medicina%'
LIMIT 50
\`\`\``
      },
      {
        tags: ['presencial', 'ead', 'modalidade'],
        text: `Exemplo (Filtro por modalidade de ensino):
\`\`\`sql
SELECT tp_modalidade_ensino, COUNT(*) FROM inep.censo_cursos GROUP BY tp_modalidade_ensino
\`\`\``
      }
    ]

    // Score examples
    const scored = pool.map(ex => {
      let score = 0
      ex.tags.forEach(tag => {
        if (q.includes(tag)) score += 1
      })
      return { ...ex, score }
    })

    // Sort descending by score, and pick top 2
    scored.sort((a, b) => b.score - a.score)

    // Always include at least 2 examples, even if score is 0
    return scored.slice(0, 2).map(ex => ex.text).join('\\n\\n')
  }

  /**
   * Tenta auto-corrigir uma query SQL que falhou na execução
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

    const basePrompt = this.buildSQLGenerationPrompt(question, reducedSchema, conversationContext)
    const correctionPrompt = `${basePrompt}\n\n🚨 ATENÇÃO: A sua consulta SQL anterior falhou durante a execução no banco de dados.\n\nERRO RETORNADO PELO BANCO:\n${error}\n\nCONSULTA QUE FALHOU:\n\`\`\`sql\n${failedSql}\n\`\`\`\n\nPor favor, analise o erro, identifique o problema na consulta original (ex: nome de coluna errado, tipagem, sintaxe) e forneça APENAS o código SQL corrigido.`

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
      } else if (provider === 'cloudflare') {
        // Cloudflare processSQL encapsulates the prompt building, so we append the error and failed SQL to context
        const errorContext = conversationContext + `\n\n🚨 TENTATIVA ANTERIOR FALHOU:\nErro: ${error}\nSQL: ${failedSql}\nCorrija a consulta focando nas regras do INEP.`
        const result = await this.cloudflareAI.processSQL(question, reducedSchema, errorContext)
        if (result.success && result.sql) {
          return { success: true, sql: result.sql }
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
   * Corrige automaticamente alucinações comuns do LLM
   */
  private autoFixCommonHallucinations(sql: string): string {
    let fixedSQL = sql

    // Mapeamento de typos comuns identificados nas rodadas de teste
    // Muitas vezes o LLM mistura o padrão "co_" (usado nas bases brutas) com "cod_" (usado no DW)
    const typoMap: Record<string, string> = {
      'co_ies': 'cod_ies',
      'co_curso': 'cod_curso',
      'co_municipio': 'cod_municipio',
      'sg_uf_ies': 'cod_municipio', // Não existe uf direto na censo_ies
      'cod_categoria_administrativa': 'id_categoria_administrativa',
      'nome_uf': 'nome_uf_ibge',
      'sigla_uf': 'uf_ibge'
    }

    // Regras especiais de substituição para tabelas específicas
    // Apenas aplica a correção se parecer ser uma coluna, evitamos substituir textos em strings
    for (const [wrong, right] of Object.entries(typoMap)) {
      // Regex que busca o erro garantindo que está no contexto de nome de coluna (pode ter . antes ou depois, etc)
      // Evita substituir strings em aspas simples.
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
        for (const [alias, tbl] of aliasMap.entries()) {
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
}
