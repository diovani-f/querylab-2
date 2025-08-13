import * as ibmdb from 'ibm_db'

export interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
}

export class DB2Service {
  private static instance: DB2Service
  private connection: any = null
  private isConnected: boolean = false
  private connectionString: string
  private config: any

  private constructor() {
    this.config = {
      host: process.env.DB2_HOST || 'localhost',
      port: parseInt(process.env.DB2_PORT || '50000'),
      database: process.env.DB2_DATABASE || 'UNIVDB',
      username: process.env.DB2_USERNAME || '',
      password: process.env.DB2_PASSWORD || '',
      ssl: process.env.DB2_SSL_ENABLED === 'true',
      connectTimeout: parseInt(process.env.DB2_CONNECTION_TIMEOUT || '30000'),
      queryTimeout: parseInt(process.env.DB2_QUERY_TIMEOUT || '60000')
    }

    this.connectionString = this.buildConnectionString()
  }

  static getInstance(): DB2Service {
    if (!DB2Service.instance) {
      DB2Service.instance = new DB2Service()
    }
    return DB2Service.instance
  }

  private buildConnectionString(): string {
    let connStr = `DATABASE=${this.config.database};HOSTNAME=${this.config.host};PORT=${this.config.port};PROTOCOL=TCPIP;UID=${this.config.username};PWD=${this.config.password};`

    if (this.config.ssl) {
      connStr += 'SECURITY=SSL;'
    }

    return connStr
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Conectando ao DB2...')
      console.log(`📡 Host: ${this.config.host}:${this.config.port}`)
      console.log(`🗄️ Database: ${this.config.database}`)

      this.connection = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout de conexão (${this.config.connectTimeout}ms)`))
        }, this.config.connectTimeout)

        ibmdb.open(this.connectionString, (err: any, conn: any) => {
          clearTimeout(timeout)
          if (err) {
            reject(err)
          } else {
            resolve(conn)
          }
        })
      })

      this.isConnected = true
      console.log('✅ Conectado ao DB2 com sucesso!')

      // Testar conexão
      await this.testConnection()
    } catch (error) {
      console.error('❌ Erro ao conectar ao DB2:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔄 Testando conexão DB2...')
      const result = await this.executeQuery('SELECT 1 FROM SYSIBM.SYSDUMMY1')
      console.log(`✅ Teste de conexão DB2 bem-sucedido`)
      return true
    } catch (error) {
      console.error('❌ Teste de conexão DB2 falhou:', error)
      return false
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.isConnected || !this.connection) {
      throw new Error('DB2 não está conectado')
    }

    const startTime = Date.now()

    try {
      console.log(`🔄 Executando query DB2: ${sql}`)

      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout de query (${this.config.queryTimeout}ms)`))
        }, this.config.queryTimeout)

        this.connection.query(sql, (err: any, data: any) => {
          clearTimeout(timeout)
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      })

      const executionTime = Date.now() - startTime

      // Processar resultado
      const processedResult = this.processQueryResult(result as any[], executionTime)
      
      console.log(`✅ Query executada em ${executionTime}ms - ${processedResult.rowCount} linhas`)
      
      return processedResult
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error(`❌ Erro na query (${executionTime}ms):`, error)
      throw error
    }
  }

  private processQueryResult(data: any[], executionTime: number): QueryResult {
    if (!data || data.length === 0) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime
      }
    }

    // Extrair nomes das colunas
    const columns = Object.keys(data[0])

    // Converter dados para formato de matriz
    const rows = data.map(row => columns.map(col => row[col]))

    return {
      columns,
      rows,
      rowCount: data.length,
      executionTime
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await new Promise((resolve, reject) => {
          this.connection.close((err: any) => {
            if (err) {
              reject(err)
            } else {
              resolve(undefined)
            }
          })
        })
        console.log('✅ Desconectado do DB2')
      } catch (error) {
        console.error('❌ Erro ao desconectar do DB2:', error)
      }
      
      this.connection = null
      this.isConnected = false
    }
  }

  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      ssl: this.config.ssl
    }
  }
}
