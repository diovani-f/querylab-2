import { DatabaseAdapter, QueryResult } from '../types'
import { DatabaseFactory } from '../adapters/database-factory'
import { JsonServerAdapter } from '../adapters/json-server-adapter'
import { DB2HttpAdapter } from '../adapters/db2-http-adapter'
import { PostgresAdapter } from '../adapters/postgres-adapter'

/**
 * Serviço dedicado para execução de consultas SQL
 * Separado do DatabaseService principal para permitir arquitetura híbrida:
 * - DatabaseService: JSON Server (auth, sessões, histórico)
 * - QueryDatabaseService: DB2 (consultas SQL da LLM)
 */
export class QueryDatabaseService {
  private static instance: QueryDatabaseService
  private adapter: DatabaseAdapter | null = null
  private isInitialized: boolean = false
  private queryDbType: string

  private constructor() {
    this.queryDbType = process.env.QUERY_DB_TYPE || 'postgres'
  }

  static getInstance(): QueryDatabaseService {
    if (!QueryDatabaseService.instance) {
      QueryDatabaseService.instance = new QueryDatabaseService()
    }
    return QueryDatabaseService.instance
  }

  /**
   * Inicializa o serviço de consultas
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Criar adapter próprio sem interferir no DatabaseFactory singleton
      switch (this.queryDbType) {
        case 'db2-http':
          const serviceUrl = DatabaseFactory.getDB2HttpConfig()
          this.adapter = new DB2HttpAdapter(serviceUrl)
          break
        case 'json-server':
          const jsonConfig = DatabaseFactory.getJsonServerConfig()
          this.adapter = new JsonServerAdapter(jsonConfig.baseUrl)
          break
        case 'postgres':
          const postgresConfig = DatabaseFactory.getQueryPostgresConfig()
          this.adapter = new PostgresAdapter(postgresConfig.connectionString, postgresConfig.schemas);
          break;
        default:
          throw new Error(`Tipo de banco não suportado para consultas: ${this.queryDbType}`)
      }

      // Conectar o adapter
      try {
        await this.adapter.connect()
        this.isInitialized = true
        console.log(`✅ QueryDatabaseService inicializado com ${this.queryDbType}`)
      } catch (connectError) {
        // Se falhar com DB2 via HTTP, tentar JSON Server como fallback
        if (this.queryDbType === 'db2-http') {
          console.warn('⚠️ Falha ao conectar DB2 Service, usando JSON Server como fallback')
          const jsonConfig = DatabaseFactory.getJsonServerConfig()
          this.adapter = new JsonServerAdapter(jsonConfig.baseUrl)
          await this.adapter.connect()
          this.queryDbType = 'json-server'
          this.isInitialized = true
          console.log('✅ QueryDatabaseService inicializado com json-server (fallback)')
        } else {
          throw connectError
        }
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar QueryDatabaseService:', error)
      // Não fazer throw do erro - permitir que o sistema continue funcionando
      console.log('💡 Sistema continuará funcionando com funcionalidade limitada')
      this.isInitialized = false
    }
  }

  /**
   * Executa uma consulta SQL
   */
  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.adapter) {
      throw new Error('QueryDatabaseService não foi inicializado corretamente')
    }

    try {
      const result = await this.adapter.query(sql)
      return result
    } catch (error) {
      console.error('❌ Erro ao executar consulta:', error)
      throw error
    }
  }

  /**
   * Testa a conexão do banco de consultas
   */
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.adapter) {
      return false
    }

    try {
      return await this.adapter.testConnection()
    } catch (error) {
      console.error('❌ Erro ao testar conexão de consultas:', error)
      return false
    }
  }

  /**
   * Obtém informações do schema (para DB2)
   */
  async getSchemaInfo(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.adapter) {
      throw new Error('QueryDatabaseService não foi inicializado')
    }

    try {
      if (this.queryDbType === 'db2' && 'getSchema' in this.adapter) {
        return await (this.adapter as any).getSchema()
      } else {
        // Para outros tipos de banco, retornar schema básico
        return {
          tables: [],
          views: [],
          procedures: []
        }
      }
    } catch (error) {
      console.error('❌ Erro ao obter schema:', error)
      throw error
    }
  }

  /**
   * Obtém informações de uma tabela específica
   */
  async getTableInfo(tableName: string): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.adapter) {
      throw new Error('QueryDatabaseService não foi inicializado')
    }

    try {
      if (this.queryDbType === 'db2' && 'getTableInfo' in this.adapter) {
        return await (this.adapter as any).getTableInfo(tableName)
      } else {
        return {
          name: tableName,
          columns: [],
          indexes: [],
          constraints: []
        }
      }
    } catch (error) {
      console.error('❌ Erro ao obter informações da tabela:', error)
      throw error
    }
  }

  /**
   * Desconecta do banco de consultas
   */
  async disconnect(): Promise<void> {
    if (this.adapter) {
      try {
        await this.adapter.disconnect()
      } catch (error) {
        console.error('❌ Erro ao desconectar QueryDatabaseService:', error)
      }
    }

    this.adapter = null
    this.isInitialized = false
  }

  /**
   * Obtém status do serviço
   */
  getStatus(): {
    isInitialized: boolean
    queryDbType: string
    isConnected: boolean
  } {
    return {
      isInitialized: this.isInitialized,
      queryDbType: this.queryDbType,
      isConnected: this.adapter !== null
    }
  }

  /**
   * Força reinicialização (útil para mudanças de configuração)
   */
  async reinitialize(): Promise<void> {
    await this.disconnect()
    await this.initialize()
  }
}
