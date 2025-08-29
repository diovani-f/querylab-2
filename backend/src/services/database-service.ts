import { DatabaseFactory, DatabaseType } from '../adapters/database-factory'
import { DatabaseAdapter, QueryResult } from '../types'

export class DatabaseService {
  private static instance: DatabaseService | null = null
  private adapter: DatabaseAdapter | null = null

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService()
    }
    return this.instance
  }

  async initialize(type?: DatabaseType): Promise<void> {
    try {
      const dbType = type || (process.env.DB_TYPE as DatabaseType) || 'json-server'

      let config: any
      switch (dbType) {
        case 'json-server':
          config = DatabaseFactory.getJsonServerConfig()
          break
        case 'postgres':
            config = DatabaseFactory.getPostgresConfig()
            break
      }

      try {
        this.adapter = await DatabaseFactory.getInstance(dbType, config)
        console.log(`✅ DatabaseService inicializado com ${dbType}`)
      } catch (dbError) {
        throw dbError
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar DatabaseService:', error)
      throw error
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.adapter) {
      throw new Error('DatabaseService não foi inicializado')
    }

    try {
      const result = await this.adapter.query(sql)
      return result
    } catch (error) {
      console.error('❌ Erro ao executar query:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.adapter) {
      return false
    }

    try {
      return await this.adapter.testConnection()
    } catch {
      return false
    }
  }

  async switchDatabase(type: DatabaseType): Promise<void> {
    try {
      let config: any
      switch (type) {
        case 'json-server':
          config = DatabaseFactory.getJsonServerConfig()
          break
        case 'db2-http':
          config = DatabaseFactory.getDB2HttpConfig()
          break
        case 'postgres':
          config = DatabaseFactory.getPostgresConfig()
          break
      }

      this.adapter = await DatabaseFactory.switchDatabase(type, config)
      console.log(`✅ Banco de dados alterado para: ${type}`)
    } catch (error) {
      console.error(`❌ Erro ao alterar banco para ${type}:`, error)
      throw error
    }
  }

  getCurrentDatabaseType(): DatabaseType | null {
    const factoryType = DatabaseFactory.getCurrentType()
    return factoryType || (process.env.DB_TYPE as DatabaseType) || 'json-server'
  }

  async getDatabaseInfo(): Promise<any> {
    const info = await DatabaseFactory.getDatabaseInfo()
    return {
      ...info,
      service: 'DatabaseService',
      initialized: this.adapter !== null
    }
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      await DatabaseFactory.disconnect()
      this.adapter = null
      console.log('🔌 DatabaseService desconectado')
    }
  }
}
