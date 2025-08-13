import * as ibmdb from 'ibm_db'
import axios from 'axios'

export interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
}

export interface ProxyConfig {
  enabled: boolean
  url: string
  timeout: number
}

export class DB2Service {
  private static instance: DB2Service
  private connection: any = null
  private isConnected: boolean = false
  private connectionString: string
  private config: any
  private proxyConfig: ProxyConfig

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

    this.proxyConfig = {
      enabled: process.env.USE_DB2_PROXY === 'true',
      url: process.env.DB2_PROXY_URL || '',
      timeout: parseInt(process.env.DB2_PROXY_TIMEOUT || '30000')
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
      if (this.proxyConfig.enabled) {
        console.log('🔄 Inicializando DB2 Service via Proxy...')
        console.log(`📡 Proxy URL: ${this.proxyConfig.url}`)

        // Testar conexão com proxy
        await this.testProxyConnection()
        this.isConnected = true
        console.log('✅ Conectado ao DB2 via proxy com sucesso!')
      } else {
        console.log('🔄 Conectando ao DB2 diretamente...')
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
        console.log('✅ Conectado ao DB2 diretamente com sucesso!')

        // Testar conexão
        await this.testConnection()
      }
    } catch (error) {
      console.error('❌ Erro ao conectar ao DB2:', error)
      throw error
    }
  }

  private async testProxyConnection(): Promise<void> {
    try {
      console.log('🔄 Testando conexão com proxy...')

      const response = await axios.get(`${this.proxyConfig.url}/health`, {
        timeout: this.proxyConfig.timeout
      })

      if (response.status === 200) {
        console.log('✅ Proxy está acessível')

        // Testar query via proxy
        await this.executeQueryViaProxy('SELECT 1 FROM SYSIBM.SYSDUMMY1')
        console.log('✅ Teste de query via proxy bem-sucedido')
      } else {
        throw new Error(`Proxy retornou status ${response.status}`)
      }
    } catch (error: any) {
      console.error('❌ Teste de conexão com proxy falhou:', error.message)
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
    // Se proxy estiver habilitado, usar proxy ao invés de conexão direta
    if (this.proxyConfig.enabled) {
      return this.executeQueryViaProxy(sql)
    }

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

  private async executeQueryViaProxy(sql: string): Promise<QueryResult> {
    const startTime = Date.now()

    try {
      console.log(`🔄 Executando query via proxy: ${sql}`)

      const response = await axios.post(
        `${this.proxyConfig.url}/query`,
        { sql },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DB2_PROXY_SECRET}`,
            'Content-Type': 'application/json'
          },
          timeout: this.proxyConfig.timeout
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro no proxy')
      }

      const executionTime = Date.now() - startTime
      console.log(`✅ Query via proxy executada em ${executionTime}ms`)

      return response.data.data
    } catch (error: any) {
      const executionTime = Date.now() - startTime
      console.error(`❌ Erro na query via proxy (${executionTime}ms):`, error)

      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Proxy error: ${error.response.data?.error || error.response.statusText}`)
        } else if (error.request) {
          throw new Error('Proxy não está acessível')
        }
      }

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
