import { QueryResult } from '../types'
import { QueryDatabaseService } from './query-database-service'
import { QueryExecutionService, QueryExecutionOptions } from './query-execution-service'

/**
 * Serviço responsável por executar consultas SQL
 * Agora usa o QueryDatabaseService para suportar arquitetura híbrida:
 * - Dados da aplicação: JSON Server
 * - Consultas SQL: DB2 (ou fallback para simulação)
 */
export class QueryService {
  private static instance: QueryService
  private queryDbService: QueryDatabaseService
  private executionService: QueryExecutionService

  public static getInstance(): QueryService {
    if (!QueryService.instance) {
      QueryService.instance = new QueryService()
    }
    return QueryService.instance
  }

  constructor() {
    this.queryDbService = QueryDatabaseService.getInstance()
    this.executionService = QueryExecutionService.getInstance()
  }

  /**
   * Executa uma consulta SQL usando o banco configurado (método legado)
   */
  async executeQuery(sql: string): Promise<QueryResult> {
    return await this.queryDbService.executeQuery(sql)
  }

  /**
   * Executa uma consulta SQL com timeout e retry
   */
  async executeQueryWithTimeout(
    sql: string,
    options?: QueryExecutionOptions
  ): Promise<QueryResult> {
    return await this.executionService.executeWithTimeout(sql, options)
  }

  /**
   * Executa uma consulta SQL com progress callback
   */
  async executeQueryWithProgress(
    sql: string,
    progressCallback: (status: string) => void,
    options?: QueryExecutionOptions
  ): Promise<QueryResult> {
    return await this.executionService.executeWithProgress(sql, progressCallback, options)
  }

  /**
   * Cria uma mensagem de resposta formatada baseada no resultado da query
   */
  createResponseMessage(): string {
    return `Consulta processada com sucesso!`
  }

  /**
   * Testa a conexão do banco de consultas
   */
  async testQueryConnection(): Promise<boolean> {
    try {
      return await this.queryDbService.testConnection()
    } catch (error) {
      console.error('❌ Erro ao testar conexão de consultas:', error)
      return false
    }
  }

  /**
   * Obtém informações do schema
   */
  async getSchemaInfo(): Promise<any> {
    try {
      return await this.queryDbService.getSchemaInfo()
    } catch (error) {
      console.warn('⚠️ Erro ao obter schema, retornando vazio:', error)
      return { tables: [], views: [], procedures: [] }
    }
  }

  /**
   * Obtém status dos serviços de consulta
   */
  getQueryServiceStatus(): any {
    return this.queryDbService.getStatus()
  }
}
