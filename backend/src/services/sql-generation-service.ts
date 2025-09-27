import { LLMService } from './llm-service'
import { CloudflareAIService } from './cloudflare-ai-service'
import { SchemaDiscoveryService } from './schema-discovery-service'
import { GroqService } from './groq-service'
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
  private smartSchemaReducer: SmartSchemaReducer
  private groqService?: GroqService

  private constructor() {
    this.llmService = LLMService.getInstance()
    this.cloudflareAI = CloudflareAIService.getInstance()
    this.schemaService = SchemaDiscoveryService.getInstance()
    this.smartSchemaReducer = SmartSchemaReducer.getInstance()

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
   * Obtém schema reduzido para a pergunta
   */
  private async getReducedSchema(question: string): Promise<{
    success: boolean
    reducedSchema?: string
    error?: string
  }> {
    try {
      // Obter schema completo
      const fullSchema = await this.schemaService.getSchemaForLLM('inep')

      if (!fullSchema || !fullSchema.tables || fullSchema.tables.length === 0) {
        return {
          success: false,
          error: 'Schema do banco não encontrado'
        }
      }

      const reductionResult = await this.cloudflareAI.fallbackLLMReduction(question, fullSchema);

      // Reduzir schema usando SmartSchemaReducer (análise inteligente baseada na pergunta)
      // const reductionResult = await this.smartSchemaReducer.reduceSchema({
      //   question,
      //   schemaName: 'inep',
      //   maxTables: 15,
      //   includeRelationships: true
      // })

      if (!reductionResult.success) {
        console.warn('⚠️ Falha na redução do schema, usando schema completo')
        return {
          success: true,
          reducedSchema: JSON.stringify(fullSchema, null, 2)
        }
      }

      // console.log('🧠 Schema reduzido com sucesso:', {
      //   tabelas: reductionResult.selectedTables?.length,
      //   reasoning: reductionResult.reasoning
      // })

      return {
        success: true,
        reducedSchema: reductionResult.reducedSchema
      }

    } catch (error) {
      console.error('❌ Erro ao obter schema reduzido:', error)
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
        return await this.generateWithCloudflare(question, reducedSchema, conversationContext)
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
   * Gera SQL usando Cloudflare AI
   */
  private async generateWithCloudflare(
    question: string,
    reducedSchema: string,
    conversationContext: string = ""
  ): Promise<{
    success: boolean
    sql?: string
    error?: string
  }> {
    const prompt = `
### Task
Generate a SQL query to answer this question: ${question}
${conversationContext}

### Database Schema
${reducedSchema}

### Important Rules
- Return ONLY clean SQL code without semicolon at the end
- ALWAYS prefix table names with "inep." (e.g., inep.censo_cursos, inep.censo_modalidades_ensino)
- ALWAYS add LIMIT 100 to SELECT * queries to prevent database overload
- Use LIMIT 50 for complex queries with JOINs
- Consider the conversation context when generating the query
- Optimize for performance and safety

### SQL Query
`

    const result = await this.cloudflareAI.generateSQL({ prompt })

    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    const sql = this.cloudflareAI.extractSQL(result.result || '')
    return {
      success: true,
      sql
    }
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
    const prompt = `
Você é um especialista em SQL e dados educacionais do INEP. Gere uma consulta SQL otimizada para responder a pergunta sobre dados educacionais.
${conversationContext}
PERGUNTA: ${question}

SCHEMA DO BANCO (INEP):
${reducedSchema}

REGRAS OBRIGATÓRIAS:
- Retorne APENAS o código SQL limpo, sem explicações ou formatação markdown
- NÃO adicione ponto e vírgula (;) no final - será adicionado automaticamente
- SEMPRE prefixe nomes de tabelas com "inep." (ex: inep.censo_cursos, inep.censo_modalidades_ensino)
- Use nomes exatos de tabelas e colunas do schema fornecido
- SEMPRE adicione LIMIT 100 para SELECT * (proteção do banco)
- Use LIMIT 50 para consultas com múltiplos JOINs
- Priorize performance: use índices quando disponíveis
- Para dados educacionais, considere filtros por ano quando relevante
- CONSIDERE o contexto da conversa anterior para gerar consultas mais precisas

CONTEXTO EDUCACIONAL:
- Dados do ensino superior brasileiro
- Informações sobre cursos, instituições, estudantes
- Dados históricos por ano acadêmico

SQL:`

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

      // 5. Adicionar proteções de segurança
      const protectedSQL = this.addSafetyProtections(cleanSQL)
      if (protectedSQL !== cleanSQL) {
        warnings.push('Adicionadas proteções de segurança (LIMIT)')
      }

      // 6. Validar palavras-chave perigosas
      const dangerousKeywords = this.checkDangerousKeywords(protectedSQL)
      if (dangerousKeywords.length > 0) {
        errors.push(`Palavras-chave não permitidas: ${dangerousKeywords.join(', ')}`)
      }

      // 7. Verificar tamanho da query
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
    const tableReferences = sql.match(/(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)

    if (tableReferences) {
      for (const ref of tableReferences) {
        const tableName = ref.split(/\s+/)[1]
        if (!tableName.startsWith('inep.')) {
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
