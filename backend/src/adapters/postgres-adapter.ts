import { Client } from 'pg'
import { DatabaseAdapter, QueryResult } from '../types'

export class PostgresAdapter implements DatabaseAdapter {
  private client: Client

  constructor(private connectionString: string) {
    this.client = new Client({
      connectionString: this.connectionString,
    })
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect()
      console.log('✅ Conectado ao PostgreSQL.')
    } catch (error) {
      console.error('❌ Erro ao conectar ao PostgreSQL:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await this.client.end()
    console.log('🔌 Conexão com PostgreSQL desconectada.')
  }

  async query(sql: string): Promise<QueryResult> {
    try {
      const result = await this.client.query(sql)
      return {
        success: true,
        data: result.rows,
      }
    } catch (error: any) {
      console.error('❌ Erro ao executar query no PostgreSQL:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }
}
