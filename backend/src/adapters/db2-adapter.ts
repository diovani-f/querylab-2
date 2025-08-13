import { DatabaseAdapter, QueryResult } from '../types'

// Importação condicional do driver IBM DB2
let ibmdb: any = null
try {
  ibmdb = require('ibm_db')
} catch (error) {
  console.warn('⚠️ Driver IBM DB2 não encontrado. Usando modo simulado.')
}

export class DB2Adapter implements DatabaseAdapter {
  private connectionString: string
  private isConnected: boolean = false
  private connection: any = null
  private config: any
  private retryAttempts: number
  private retryDelay: number
  private connectionTimeout: number
  private queryTimeout: number

  constructor(connectionConfig: {
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl?: boolean
    connectTimeout?: number
    queryTimeout?: number
    retryAttempts?: number
    retryDelay?: number
  }) {
    this.config = connectionConfig
    this.retryAttempts = connectionConfig.retryAttempts || 3
    this.retryDelay = connectionConfig.retryDelay || 5000
    this.connectionTimeout = connectionConfig.connectTimeout || 30000
    this.queryTimeout = connectionConfig.queryTimeout || 60000

    // Construir string de conexão DB2
    this.connectionString = this.buildConnectionString(connectionConfig)
  }

  private buildConnectionString(config: any): string {
    let connStr = `DATABASE=${config.database};HOSTNAME=${config.host};PORT=${config.port};PROTOCOL=TCPIP;UID=${config.username};PWD=${config.password};`

    // Adicionar configurações SSL se habilitado
    if (config.ssl) {
      connStr += 'SECURITY=SSL;'
    }

    // Adicionar timeouts
    connStr += `CONNECTTIMEOUT=${Math.floor(this.connectionTimeout / 1000)};`

    return connStr
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }

    let lastError: any = null

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${this.retryAttempts} - Conectando ao DB2...`)
        console.log(`📡 Host: ${this.config.host}:${this.config.port}`)
        console.log(`🗄️ Database: ${this.config.database}`)

        if (ibmdb) {
          // Conexão real com DB2
          this.connection = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Timeout de conexão (${this.connectionTimeout}ms)`))
            }, this.connectionTimeout)

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
          return
        } else {
          // Modo simulado quando driver não está disponível
          console.log('🔄 Driver DB2 não disponível - usando modo simulado...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          this.isConnected = true
          console.log('✅ Conectado ao DB2 (modo simulado)')
          return
        }
      } catch (error) {
        lastError = error
        this.isConnected = false

        console.error(`❌ Tentativa ${attempt} falhou:`, error)

        if (attempt < this.retryAttempts) {
          console.log(`⏳ Aguardando ${this.retryDelay}ms antes da próxima tentativa...`)
          await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        }
      }
    }

    throw new Error(`Falha ao conectar com DB2 após ${this.retryAttempts} tentativas: ${lastError?.message || lastError}`)
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.isConnected) {
      await this.connect()
    }

    const startTime = Date.now()

    try {
      console.log(`🔄 Executando query DB2: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`)

      if (ibmdb && this.connection) {
        // Execução real da query
        const result = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timeout de query (${this.queryTimeout}ms)`))
          }, this.queryTimeout)

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

        // Processar resultado real do DB2
        const processedResult = this.processDB2Result(result)

        console.log(`✅ Query executada em ${executionTime}ms - ${processedResult.rowCount} linhas`)

        return {
          ...processedResult,
          executionTime
        }
      } else {
        // Modo simulado
        await new Promise(resolve => setTimeout(resolve, 800))
        const mockResult = this.generateMockResult(sql)
        const executionTime = Date.now() - startTime

        console.log(`✅ Query simulada executada em ${executionTime}ms - ${mockResult.rows.length} linhas`)

        return {
          columns: mockResult.columns,
          rows: mockResult.rows,
          rowCount: mockResult.rows.length,
          executionTime
        }
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error(`❌ Erro na query após ${executionTime}ms:`, error)
      throw new Error(`Erro ao executar query DB2: ${error}`)
    }
  }

  private processDB2Result(result: any): { columns: string[], rows: any[][], rowCount: number } {
    if (!result || !Array.isArray(result)) {
      return { columns: [], rows: [], rowCount: 0 }
    }

    if (result.length === 0) {
      return { columns: [], rows: [], rowCount: 0 }
    }

    // Extrair nomes das colunas do primeiro registro
    const columns = Object.keys(result[0])

    // Converter registros em arrays de valores
    const rows = result.map((row: any) => columns.map(col => row[col]))

    return {
      columns,
      rows,
      rowCount: result.length
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (ibmdb && this.connection) {
        // Desconexão real
        await new Promise<void>((resolve, reject) => {
          this.connection.close((err: any) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      }

      this.isConnected = false
      this.connection = null
      console.log('🔌 Desconectado do DB2')
    } catch (error) {
      console.error('❌ Erro ao desconectar do DB2:', error)
      // Forçar desconexão mesmo com erro
      this.isConnected = false
      this.connection = null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔄 Testando conexão DB2...')

      if (ibmdb) {
        // Teste real com query simples do DB2
        const testQuery = 'SELECT 1 FROM SYSIBM.SYSDUMMY1'
        await this.query(testQuery)
        console.log('✅ Teste de conexão DB2 bem-sucedido')
        return true
      } else {
        // Teste simulado
        await new Promise(resolve => setTimeout(resolve, 500))
        console.log('✅ Teste de conexão DB2 simulado bem-sucedido')
        return true
      }
    } catch (error) {
      console.error('❌ Teste de conexão DB2 falhou:', error)
      return false
    }
  }

  private generateMockResult(sql: string): { columns: string[], rows: any[][] } {
    // Gerar resultado mock baseado no SQL
    const sqlLower = sql.toLowerCase()

    if (sqlLower.includes('universidades') || sqlLower.includes('university')) {
      return {
        columns: ['ID', 'NOME', 'SIGLA', 'TIPO', 'REGIAO', 'ESTADO'],
        rows: [
          [1, 'Universidade Federal do Rio de Janeiro', 'UFRJ', 'Federal', 'Sudeste', 'Rio de Janeiro'],
          [2, 'Universidade de São Paulo', 'USP', 'Estadual', 'Sudeste', 'São Paulo'],
          [3, 'Universidade Federal de Minas Gerais', 'UFMG', 'Federal', 'Sudeste', 'Minas Gerais']
        ]
      }
    } else if (sqlLower.includes('pessoas') || sqlLower.includes('person')) {
      return {
        columns: ['ID', 'NOME', 'TIPO', 'UNIVERSIDADE_ID', 'DEPARTAMENTO'],
        rows: [
          [1, 'Dr. João Silva', 'professor', 1, 'Ciência da Computação'],
          [2, 'Dra. Maria Santos', 'professor', 2, 'Engenharia de Software'],
          [3, 'Ana Costa', 'aluno', 1, 'Ciência da Computação']
        ]
      }
    } else {
      return {
        columns: ['RESULTADO'],
        rows: [['Query executada com sucesso no DB2']]
      }
    }
  }

  // Métodos específicos para DB2
  async getSchema(): Promise<any> {
    // TODO: Implementar obtenção do schema do DB2
    return {
      tables: ['UNIVERSIDADES', 'PESSOAS', 'CURSOS', 'REGIOES'],
      views: [],
      procedures: []
    }
  }

  async getTableInfo(tableName: string): Promise<any> {
    // TODO: Implementar obtenção de informações da tabela
    return {
      name: tableName,
      columns: [],
      indexes: [],
      constraints: []
    }
  }

  // Configurações específicas para ambiente universitário/VPN
  static createVPNConfig(vpnHost: string, localPort: number = 50000): any {
    return {
      host: vpnHost,
      port: localPort,
      database: 'UNIVDB',
      username: process.env.DB2_USERNAME || '',
      password: process.env.DB2_PASSWORD || '',
      // Configurações específicas para VPN
      ssl: true,
      sslMode: 'require',
      connectTimeout: 30000,
      queryTimeout: 60000
    }
  }
}
