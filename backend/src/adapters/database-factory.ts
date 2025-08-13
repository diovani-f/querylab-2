import { DatabaseAdapter } from '../types'
import { JsonServerAdapter } from './json-server-adapter'
import { DB2HttpAdapter } from './db2-http-adapter'

export type DatabaseType = 'json-server' | 'db2-http'

export class DatabaseFactory {
  private static instance: DatabaseAdapter | null = null
  private static currentType: DatabaseType | null = null

  static async createAdapter(type: DatabaseType, config?: any): Promise<DatabaseAdapter> {
    let adapter: DatabaseAdapter

    switch (type) {
      case 'json-server':
        adapter = new JsonServerAdapter(config?.baseUrl || 'http://localhost:3001')
        break

      case 'db2-http':
        const serviceUrl = config?.serviceUrl || process.env.DB2_SERVICE_URL || 'http://localhost:5001'
        adapter = new DB2HttpAdapter(serviceUrl)
        break

      default:
        throw new Error(`Tipo de banco não suportado: ${type}`)
    }

    // Testar conexão
    try {
      await adapter.connect()
    } catch (error) {
      console.error(`❌ Erro ao conectar adaptador ${type}:`, error)
      throw error
    }

    return adapter
  }

  static async getInstance(type?: DatabaseType, config?: any): Promise<DatabaseAdapter> {
    // Se já existe uma instância do mesmo tipo, retornar
    if (this.instance && this.currentType === type) {
      return this.instance
    }

    // Se mudou o tipo ou não existe instância, criar nova
    if (this.instance && this.currentType !== type) {
      await this.instance.disconnect()
    }

    const dbType = type || this.getDefaultType()
    this.instance = await this.createAdapter(dbType, config)
    this.currentType = dbType

    return this.instance
  }

  static async switchDatabase(type: DatabaseType, config?: any): Promise<DatabaseAdapter> {
    if (this.instance) {
      await this.instance.disconnect()
    }

    this.instance = await this.createAdapter(type, config)
    this.currentType = type

    return this.instance
  }

  static getCurrentType(): DatabaseType | null {
    return this.currentType
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect()
      this.instance = null
      this.currentType = null
    }
  }

  private static getDefaultType(): DatabaseType {
    const envType = process.env.DB_TYPE as DatabaseType
    return envType || 'json-server'
  }

  // Configurações pré-definidas
  static getJsonServerConfig(): any {
    return {
      baseUrl: process.env.JSON_SERVER_URL || 'http://localhost:3001'
    }
  }

  static getDB2HttpConfig(): any {
    return {
      serviceUrl: process.env.DB2_SERVICE_URL || 'http://localhost:5001'
    }
  }

  // Método para testar conectividade
  static async testConnection(type: DatabaseType, config?: any): Promise<boolean> {
    try {
      const adapter = await this.createAdapter(type, config)
      const isConnected = await adapter.testConnection()
      await adapter.disconnect()
      return isConnected
    } catch {
      return false
    }
  }

  // Método para obter informações do banco atual
  static async getDatabaseInfo(): Promise<any> {
    if (!this.instance) {
      throw new Error('Nenhuma conexão de banco ativa')
    }

    return {
      type: this.currentType,
      connected: await this.instance.testConnection(),
      // Adicionar mais informações conforme necessário
    }
  }
}
