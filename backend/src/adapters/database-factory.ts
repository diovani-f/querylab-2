import { DatabaseAdapter } from '../types'
import { JsonServerAdapter } from './json-server-adapter'
import { DB2Adapter } from './db2-adapter'

export type DatabaseType = 'json-server' | 'db2'

export class DatabaseFactory {
  private static instance: DatabaseAdapter | null = null
  private static currentType: DatabaseType | null = null

  static async createAdapter(type: DatabaseType, config?: any): Promise<DatabaseAdapter> {
    let adapter: DatabaseAdapter

    switch (type) {
      case 'json-server':
        adapter = new JsonServerAdapter(config?.baseUrl || 'http://localhost:3001')
        break

      case 'db2':
        if (!config) {
          throw new Error('Configuração DB2 é obrigatória')
        }
        adapter = new DB2Adapter(config)
        break

      default:
        throw new Error(`Tipo de banco não suportado: ${type}`)
    }

    // Testar conexão
    try {
      await adapter.connect()
      console.log(`✅ Adaptador ${type} criado e conectado com sucesso`)
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
    console.log(`🔄 Mudando banco de dados para: ${type}`)

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

  static getDB2Config(): any {
    return {
      host: process.env.DB2_HOST || 'localhost',
      port: parseInt(process.env.DB2_PORT || '50000'),
      database: process.env.DB2_DATABASE || 'UNIVDB',
      username: process.env.DB2_USERNAME || '',
      password: process.env.DB2_PASSWORD || '',
      ssl: process.env.DB2_SSL_ENABLED === 'true',
      connectTimeout: parseInt(process.env.DB2_CONNECTION_TIMEOUT || '30000'),
      queryTimeout: parseInt(process.env.DB2_QUERY_TIMEOUT || '60000'),
      retryAttempts: parseInt(process.env.DB2_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DB2_RETRY_DELAY || '5000')
    }
  }

  // Método para configuração via VPN universitária
  static getDB2VPNConfig(): any {
    return {
      host: process.env.DB2_VPN_HOST || '',
      port: parseInt(process.env.DB2_VPN_PORT || '50000'),
      database: process.env.DB2_VPN_DATABASE || 'UNIVDB',
      username: process.env.DB2_VPN_USERNAME || '',
      password: process.env.DB2_VPN_PASSWORD || '',
      // Usar configuração SSL do ambiente, não forçar
      ssl: process.env.DB2_SSL_ENABLED === 'true',
      connectTimeout: parseInt(process.env.DB2_CONNECTION_TIMEOUT || '30000'),
      queryTimeout: parseInt(process.env.DB2_QUERY_TIMEOUT || '60000'),
      // Configurações de retry para conexões instáveis via VPN
      retryAttempts: parseInt(process.env.DB2_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DB2_RETRY_DELAY || '5000')
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
