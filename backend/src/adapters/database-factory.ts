import { DatabaseAdapter } from '../types'
import { JsonServerAdapter } from './json-server-adapter'
import { DB2HttpAdapter } from './db2-http-adapter'
import { PostgresAdapter } from './postgres-adapter'

export type DatabaseType = 'json-server' | 'db2-http' | 'postgres' // Adicionado 'postgres'

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
      case 'postgres':
        const connectionString = config?.connectionString || process.env.POSTGRES_URL
        if (!connectionString) {
            throw new Error('POSTGRES_URL não configurado nas variáveis de ambiente.');
        }
        const schemas = config?.schemas || ['inep', 'public']
        adapter = new PostgresAdapter(connectionString, schemas)
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
    if (this.instance && this.currentType === type) {
      return this.instance
    }

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

  // Métodos de configuração
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

  static getPostgresConfig(): any {
   const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        throw new Error('POSTGRES_URL environment variable is not set.');
    }
    return {
      connectionString: connectionString,
      schemas: ['public']
    };
  }

  static getQueryPostgresConfig(): any {
    const host = process.env.QUERY_DB_HOST;
    const port = process.env.QUERY_DB_PORT || '5432';
    const user = process.env.QUERY_DB_USER;
    const password = process.env.QUERY_DB_PASSWORD;
    const database = process.env.QUERY_DB_DATABASE;

    if (!host || !user || !password || !database) {
        throw new Error('Variáveis de ambiente do banco de consultas não configuradas: QUERY_DB_HOST, QUERY_DB_USER, QUERY_DB_PASSWORD, QUERY_DB_DATABASE');
    }

    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;

    return {
      connectionString: connectionString,
      schemas: ['inep', 'public']
    };
  }

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

  static async getDatabaseInfo(): Promise<any> {
    if (!this.instance) {
      throw new Error('Nenhuma conexão de banco ativa')
    }

    return {
      type: this.currentType,
      connected: await this.instance.testConnection(),
    }
  }
}
