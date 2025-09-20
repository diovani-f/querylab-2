import { QueryResult } from '../types'
import { QueryDatabaseService } from './query-database-service'

export interface QueryExecutionOptions {
  timeoutMs?: number
  retryAttempts?: number
  retryDelayMs?: number
}

export interface QueryExecutionResult extends QueryResult {
  timedOut?: boolean
  retryCount?: number
  totalExecutionTime?: number
}

/**
 * Serviço para execução de queries com timeout e retry
 */
export class QueryExecutionService {
  private static instance: QueryExecutionService
  private queryDbService: QueryDatabaseService
  private readonly DEFAULT_TIMEOUT_MS = 30000 // 30 segundos
  private readonly DEFAULT_RETRY_ATTEMPTS = 2
  private readonly DEFAULT_RETRY_DELAY_MS = 1000

  private constructor() {
    this.queryDbService = QueryDatabaseService.getInstance()
  }

  static getInstance(): QueryExecutionService {
    if (!QueryExecutionService.instance) {
      QueryExecutionService.instance = new QueryExecutionService()
    }
    return QueryExecutionService.instance
  }

  /**
   * Executa query com timeout configurável
   */
  async executeWithTimeout(
    sql: string,
    options: QueryExecutionOptions = {}
  ): Promise<QueryExecutionResult> {
    const {
      timeoutMs = this.DEFAULT_TIMEOUT_MS,
      retryAttempts = this.DEFAULT_RETRY_ATTEMPTS,
      retryDelayMs = this.DEFAULT_RETRY_DELAY_MS
    } = options

    const startTime = Date.now()
    let lastError: any
    let retryCount = 0

    console.log(`🔄 Executando query com timeout de ${timeoutMs}ms`)

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Tentativa ${attempt + 1}/${retryAttempts + 1}`)
          await this.sleep(retryDelayMs * attempt) // Backoff progressivo
          retryCount++
        }

        const result = await this.executeQueryWithTimeout(sql, timeoutMs)

        if (result.success) {
          return {
            ...result,
            retryCount,
            totalExecutionTime: Date.now() - startTime
          }
        }

        lastError = result.error

        // Se não é erro temporário, não tentar novamente
        if (!this.isTemporaryError(result.error)) {
          break
        }

      } catch (error) {
        lastError = error

        // Se é timeout ou erro não temporário, não tentar novamente
        if (this.isTimeoutError(error) || !this.isTemporaryError(error)) {
          break
        }
      }
    }

    // Retornar erro final
    return {
      success: false,
      error: this.formatError(lastError),
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: Date.now() - startTime,
      retryCount,
      totalExecutionTime: Date.now() - startTime,
      timedOut: this.isTimeoutError(lastError)
    }
  }

  /**
   * Executa query com timeout usando Promise.race
   */
  private async executeQueryWithTimeout(
    sql: string,
    timeoutMs: number
  ): Promise<QueryResult> {
    const timeoutPromise = new Promise<QueryResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout após ${timeoutMs}ms`))
      }, timeoutMs)
    })

    const queryPromise = this.queryDbService.executeQuery(sql)

    try {
      return await Promise.race([queryPromise, timeoutPromise])
    } catch (error) {
      // Se é timeout, tentar cancelar a query se possível
      if (this.isTimeoutError(error)) {
        console.warn('⏰ Query timeout detectado')
        // Aqui poderia implementar cancelamento da query se o adapter suportar
      }
      throw error
    }
  }

  /**
   * Verifica se é erro temporário que justifica retry
   */
  private isTemporaryError(error: any): boolean {
    if (!error) return false

    const errorMessage = String(error).toLowerCase()
    const temporaryErrors = [
      'connection timeout',
      'connection refused',
      'connection reset',
      'temporary failure',
      'service unavailable',
      'network error',
      'connection lost',
      'connection closed',
      'timeout',
      'econnreset',
      'econnrefused',
      'etimedout'
    ]

    return temporaryErrors.some(temp => errorMessage.includes(temp))
  }

  /**
   * Verifica se é erro de timeout
   */
  private isTimeoutError(error: any): boolean {
    if (!error) return false

    const errorMessage = String(error).toLowerCase()
    return errorMessage.includes('timeout') || errorMessage.includes('etimedout')
  }

  /**
   * Formata erro para exibição retornando erro original
   */
  private formatError(error: any): string {
    return error instanceof Error ? error.message : String(error)
  }

  /**
   * Utilitário para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Executa query com progress callback
   */
  async executeWithProgress(
    sql: string,
    progressCallback: (status: string) => void,
    options: QueryExecutionOptions = {}
  ): Promise<QueryExecutionResult> {
    try {
      progressCallback('Validando consulta...')

      // Validação básica
      if (!sql || sql.trim().length === 0) {
        throw new Error('SQL vazio')
      }

      progressCallback('Conectando ao banco de dados...')

      // Testar conexão
      const isConnected = await this.queryDbService.testConnection()
      if (!isConnected) {
        throw new Error('Não foi possível conectar ao banco de dados')
      }

      progressCallback('Executando consulta...')

      // Executar com timeout
      const result = await this.executeWithTimeout(sql, options)

      if (result.success) {
        progressCallback(`Consulta concluída! ${result.rowCount} resultado(s) encontrado(s)`)
      } else {
        progressCallback('Erro na execução da consulta')
      }

      return result

    } catch (error) {
      progressCallback('Erro na execução')
      return {
        success: false,
        error: this.formatError(error),
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        totalExecutionTime: 0,
        timedOut: this.isTimeoutError(error)
      }
    }
  }

  /**
   * Obtém configurações de timeout recomendadas baseadas no SQL
   */
  getRecommendedTimeout(sql: string): number {
    const sqlLower = sql.toLowerCase()

    // Queries complexas precisam de mais tempo
    const joinCount = (sqlLower.match(/join/g) || []).length
    const hasGroupBy = sqlLower.includes('group by')
    const hasOrderBy = sqlLower.includes('order by')
    const hasSubquery = sqlLower.includes('select') &&
                       (sqlLower.match(/select/g) || []).length > 1

    let timeoutMs = this.DEFAULT_TIMEOUT_MS

    // Ajustar baseado na complexidade
    if (joinCount > 2) timeoutMs += 10000 // +10s para múltiplos JOINs
    if (hasGroupBy) timeoutMs += 5000     // +5s para GROUP BY
    if (hasOrderBy) timeoutMs += 3000     // +3s para ORDER BY
    if (hasSubquery) timeoutMs += 7000    // +7s para subqueries

    // Máximo de 60 segundos
    return Math.min(timeoutMs, 60000)
  }

  /**
   * Cancela execução (se suportado pelo adapter)
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    // Implementação futura para cancelamento de queries
    console.log(`🚫 Tentativa de cancelar execução ${executionId}`)
    return false
  }
}
