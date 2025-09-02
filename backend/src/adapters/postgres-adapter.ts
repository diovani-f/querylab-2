import { Pool, QueryResult as PgQueryResult } from 'pg'
import { DatabaseAdapter, QueryResult } from '../types'

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool
  private schemas: string[]

  constructor(private connectionString: string, schemas: string[] = ['inep', 'public']) {
    this.schemas = schemas
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    })

    // Adiciona um listener para erros no pool.
    this.pool.on('error', (err) => {
      console.error('❌ Erro inesperado no pool de conexões:', err)
    })
  }

  async connect(): Promise<void> {
    try {
      // Tenta adquirir uma conexão para verificar se o pool está funcionando.
      const client = await this.pool.connect()

      // Configurar search_path para incluir os schemas configurados
      const searchPath = this.schemas.join(', ')
      await client.query(`SET search_path TO ${searchPath}`)

      client.release() // Libera a conexão imediatamente
      console.log('✅ Pool de conexões ao PostgreSQL inicializado com search_path configurado.')
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
    const startTime = Date.now()
    const client = await this.pool.connect()

    try {
      // Configurar search_path para cada query
      const searchPath = this.schemas.join(', ')
      await client.query(`SET search_path TO ${searchPath}`)

      const result: PgQueryResult = await client.query(sql)
      const executionTime = Date.now() - startTime

      // Extrair nomes das colunas
      const columns = result.fields ? result.fields.map(field => field.name) : []

      // Converter rows para array de arrays (formato esperado)
      const rows = result.rows.map(row =>
        columns.map(col => row[col])
      )

      return {
        success: true,
        columns,
        rows,
        rowCount: result.rowCount || 0,
        executionTime
      }
    } catch (error: any) {
      console.error('❌ Erro ao executar query no PostgreSQL:', error)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  async testConnection(): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      const searchPath = this.schemas.join(', ')
      await client.query(`SET search_path TO ${searchPath}`)
      await client.query('SELECT 1')
      return true
    } catch {
      return false
    } finally {
      client.release()
    }
  }
}
