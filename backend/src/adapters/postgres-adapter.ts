import { Pool, QueryResult as PgQueryResult } from 'pg'
import { DatabaseAdapter, QueryResult } from '../types'

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool

  constructor(private connectionString: string) {
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })

    // Adiciona um listener para erros no pool.
    this.pool.on('error', (err, client) => {
      console.error('❌ Erro inesperado no pool de conexões:', err)
    })
  }

  async connect(): Promise<void> {
    try {
      // Tenta adquirir uma conexão para verificar se o pool está funcionando.
      const client = await this.pool.connect()
      client.release() // Libera a conexão imediatamente
      console.log('✅ Pool de conexões ao PostgreSQL inicializado.')
    } catch (error) {
      console.error('❌ Erro ao inicializar o pool de conexões:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end()
    console.log('🔌 Pool de conexões com PostgreSQL encerrado.')
  }

  async query(sql: string): Promise<QueryResult> {
    try {
      const result: PgQueryResult = await this.pool.query(sql)
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
      await this.pool.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }
}
