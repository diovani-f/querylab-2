import { DatabaseAdapter, QueryResult } from '../types'
import axios, { AxiosInstance } from 'axios'

export class DB2HttpAdapter implements DatabaseAdapter {
  private httpClient: AxiosInstance
  private isConnected: boolean = false
  private serviceUrl: string

  constructor(serviceUrl: string = 'http://localhost:5001') {
    this.serviceUrl = serviceUrl
    this.httpClient = axios.create({
      baseURL: serviceUrl,
      timeout: 60000, // 60 segundos
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔄 Conectando ao DB2 Service em ${this.serviceUrl}...`)

      // Testar se o serviço está disponível
      const response = await this.httpClient.get('/health')

      if (response.status === 200) {
        // Testar conexão com o banco
        const testResponse = await this.httpClient.get('/query/test')

        if (testResponse.data.success && testResponse.data.connected) {
          this.isConnected = true
          console.log('✅ Conectado ao DB2 Service com sucesso!')
        } else {
          throw new Error('DB2 Service está rodando mas não consegue conectar ao banco')
        }
      } else {
        throw new Error('DB2 Service não está respondendo')
      }
    } catch (error) {
      console.error('❌ Erro ao conectar ao DB2 Service:', error)
      this.isConnected = false
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false
    console.log('✅ Desconectado do DB2 Service')
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.isConnected) {
      throw new Error('DB2 Service não está conectado')
    }

    try {
      console.log(`🔄 Enviando query para DB2 Service: ${sql}`)

      const response = await this.httpClient.post('/query/execute', {
        sql: sql
      })

      if (response.data.success) {
        const result = response.data.result
        console.log(`✅ Query executada via DB2 Service - ${result.rowCount} linhas em ${result.executionTime}ms`)
        return result
      } else {
        throw new Error(response.data.error || 'Erro desconhecido no DB2 Service')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Erro do servidor DB2 Service
          const errorMsg = error.response.data?.error || error.message
          console.error('❌ Erro no DB2 Service:', errorMsg)
          throw new Error(`DB2 Service Error: ${errorMsg}`)
        } else if (error.request) {
          // Erro de rede/conexão
          console.error('❌ Erro de conexão com DB2 Service:', error.message)
          throw new Error('Não foi possível conectar ao DB2 Service')
        }
      }

      console.error('❌ Erro ao executar query via DB2 Service:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/query/test')
      return response.data.success && response.data.connected
    } catch (error) {
      console.error('❌ Erro ao testar conexão DB2 Service:', error)
      return false
    }
  }

  async getConnectionInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get('/query/info')
      return response.data.connection
    } catch (error) {
      console.error('❌ Erro ao obter info de conexão DB2 Service:', error)
      return null
    }
  }

  async getHealth(): Promise<any> {
    try {
      const response = await this.httpClient.get('/health/detailed')
      return response.data
    } catch (error) {
      console.error('❌ Erro ao obter health do DB2 Service:', error)
      return null
    }
  }
}
