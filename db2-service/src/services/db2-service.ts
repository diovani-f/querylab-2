import axios from 'axios'

export interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
}

export interface ProxyConfig {
  url: string
  secret: string
  timeout: number
}

export class DB2Service {
  private static instance: DB2Service
  private isConnected: boolean = false
  private proxyConfig: ProxyConfig

  private constructor() {
    this.proxyConfig = {
      url: process.env.DB2_PROXY_URL || '',
      secret: process.env.DB2_PROXY_SECRET || '',
      timeout: parseInt(process.env.DB2_PROXY_TIMEOUT || '30000')
    }

    // Validar configuração obrigatória
    if (!this.proxyConfig.url) {
      throw new Error('DB2_PROXY_URL é obrigatório')
    }
    if (!this.proxyConfig.secret) {
      throw new Error('DB2_PROXY_SECRET é obrigatório')
    }
  }

  static getInstance(): DB2Service {
    if (!DB2Service.instance) {
      DB2Service.instance = new DB2Service()
    }
    return DB2Service.instance
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Inicializando DB2 Service via Proxy...')
      console.log(`📡 Proxy URL: ${this.proxyConfig.url}`)

      // Testar conexão com proxy
      await this.testProxyConnection()
      this.isConnected = true
      console.log('✅ Conectado ao DB2 via proxy com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao conectar ao DB2 via proxy:', error)
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
      console.log('🔄 Testando conexão DB2 via proxy...')
      await this.executeQuery('SELECT 1 FROM SYSIBM.SYSDUMMY1')
      console.log(`✅ Teste de conexão DB2 bem-sucedido`)
      return true
    } catch (error) {
      console.error('❌ Teste de conexão DB2 falhou:', error)
      return false
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.isConnected) {
      throw new Error('DB2 Service não está inicializado')
    }

    return this.executeQueryViaProxy(sql)
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
            'Authorization': `Bearer ${this.proxyConfig.secret}`,
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
    this.isConnected = false
    console.log('✅ DB2 Service desconectado')
  }

  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      proxyUrl: this.proxyConfig.url,
      mode: 'proxy'
    }
  }
}
