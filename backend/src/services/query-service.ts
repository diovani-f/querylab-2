import { QueryResult } from '../types'
import { QueryDatabaseService } from './query-database-service'

/**
 * Serviço responsável por executar consultas SQL
 * Agora usa o QueryDatabaseService para suportar arquitetura híbrida:
 * - Dados da aplicação: JSON Server
 * - Consultas SQL: DB2 (ou fallback para simulação)
 */
export class QueryService {
  private static instance: QueryService
  private queryDbService: QueryDatabaseService

  public static getInstance(): QueryService {
    if (!QueryService.instance) {
      QueryService.instance = new QueryService()
    }
    return QueryService.instance
  }

  constructor() {
    this.queryDbService = QueryDatabaseService.getInstance()
  }

  /**
   * Executa uma consulta SQL usando o banco configurado
   */
  async executeQuery(sql: string): Promise<QueryResult> {
    return await this.queryDbService.executeQuery(sql)
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
