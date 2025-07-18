import { DatabaseAdapter, QueryResult } from '../types'

export class JsonServerAdapter implements DatabaseAdapter {
  private baseUrl: string
  private isConnected: boolean = false

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl
  }

  async connect(): Promise<void> {
    try {
      // Testar conexão com endpoint de universidades
      const response = await fetch(`${this.baseUrl}/universidades?_limit=1`)
      if (response.ok) {
        this.isConnected = true
        console.log('✅ Conectado ao JSON Server')
      } else {
        throw new Error('Falha ao conectar com JSON Server')
      }
    } catch (error) {
      this.isConnected = false
      throw new Error(`Erro ao conectar com JSON Server: ${error}`)
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.isConnected) {
      await this.connect()
    }

    const startTime = Date.now()

    try {
      // Simular parsing de SQL para JSON Server endpoints
      const result = await this.parseAndExecuteSQL(sql)
      const executionTime = Date.now() - startTime

      return {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rows.length,
        executionTime
      }
    } catch (error) {
      throw new Error(`Erro ao executar query: ${error}`)
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false
    console.log('🔌 Desconectado do JSON Server')
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/universidades?_limit=1`)
      return response.ok
    } catch {
      return false
    }
  }

  private async parseAndExecuteSQL(sql: string): Promise<{ columns: string[], rows: any[][] }> {
    // Parsing básico de SQL para endpoints do JSON Server
    const sqlLower = sql.toLowerCase().trim()

    if (sqlLower.includes('universidades')) {
      return await this.queryTable('universidades', sql)
    } else if (sqlLower.includes('pessoas')) {
      return await this.queryTable('pessoas', sql)
    } else if (sqlLower.includes('cursos')) {
      return await this.queryTable('cursos', sql)
    } else if (sqlLower.includes('regioes')) {
      return await this.queryTable('regioes', sql)
    } else {
      // Query padrão - retorna universidades
      return await this.queryTable('universidades', sql)
    }
  }

  private async queryTable(tableName: string, sql: string): Promise<{ columns: string[], rows: any[][] }> {
    try {
      const response = await fetch(`${this.baseUrl}/${tableName}`)
      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        return { columns: [], rows: [] }
      }

      // Aplicar filtros básicos baseados no SQL
      let filteredData = data

      // Filtro LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
      if (limitMatch) {
        const limit = parseInt(limitMatch[1])
        filteredData = filteredData.slice(0, limit)
      }

      // Filtro WHERE básico
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*(LIKE|=)\s*'([^']+)'/i)
      if (whereMatch) {
        const [, field, operator, value] = whereMatch
        if (operator.toUpperCase() === 'LIKE') {
          const searchValue = value.replace(/%/g, '')
          filteredData = filteredData.filter(item => 
            item[field] && item[field].toString().toLowerCase().includes(searchValue.toLowerCase())
          )
        } else if (operator === '=') {
          filteredData = filteredData.filter(item => 
            item[field] && item[field].toString().toLowerCase() === value.toLowerCase()
          )
        }
      }

      // Extrair colunas
      const columns = filteredData.length > 0 ? Object.keys(filteredData[0]) : []
      
      // Converter para formato de linhas
      const rows = filteredData.map(item => columns.map(col => item[col]))

      return { columns, rows }
    } catch (error) {
      console.error(`Erro ao consultar tabela ${tableName}:`, error)
      return { columns: [], rows: [] }
    }
  }

  // Métodos auxiliares para queries específicas
  async getUniversidades(filters?: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/universidades`)
    return response.json()
  }

  async getPessoas(filters?: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/pessoas`)
    return response.json()
  }

  async getCursos(filters?: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/cursos`)
    return response.json()
  }

  async getRegioes(filters?: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/regioes`)
    return response.json()
  }
}
