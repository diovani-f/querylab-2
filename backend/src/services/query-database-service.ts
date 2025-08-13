import { DatabaseAdapter, QueryResult } from '../types'
import { DatabaseFactory } from '../adapters/database-factory'
import { VPNDetector } from '../utils/vpn-detector'

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
    this.queryDbType = process.env.QUERY_DB_TYPE || 'json-server'
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
      console.log(`🔄 Inicializando QueryDatabaseService com ${this.queryDbType}`)

      let config: any
      switch (this.queryDbType) {
        case 'db2':
          config = await this.getDB2Config()
          break
        case 'json-server':
          config = DatabaseFactory.getJsonServerConfig()
          break
        default:
          throw new Error(`Tipo de banco não suportado para consultas: ${this.queryDbType}`)
      }

      this.adapter = await DatabaseFactory.getInstance(this.queryDbType as any, config)
      this.isInitialized = true
      
      console.log(`✅ QueryDatabaseService inicializado com ${this.queryDbType}`)
    } catch (error) {
      console.error('❌ Erro ao inicializar QueryDatabaseService:', error)
      throw error
    }
  }

  /**
   * Obtém configuração DB2 baseada no status da VPN
   */
  private async getDB2Config(): Promise<any> {
    try {
      // Detectar VPN para escolher configuração apropriada
      const vpnDetector = VPNDetector.getInstance()
      const vpnStatus = await vpnDetector.detectGlobalProtect()
      
      if (vpnStatus.isConnected && process.env.DB2_VPN_HOST) {
        console.log('🔗 Usando configuração DB2 via VPN')
        return DatabaseFactory.getDB2VPNConfig()
      } else {
        console.log('🏠 Usando configuração DB2 local')
        return DatabaseFactory.getDB2Config()
      }
    } catch (error) {
      console.warn('⚠️ Erro ao detectar VPN, usando configuração local:', error)
      return DatabaseFactory.getDB2Config()
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
      console.log(`🔍 Executando consulta SQL via ${this.queryDbType}`)
      const result = await this.adapter.query(sql)
      
      console.log(`✅ Consulta executada: ${result.rowCount} linhas em ${result.executionTime}ms`)
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
        console.log('🔌 QueryDatabaseService desconectado')
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
