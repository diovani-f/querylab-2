import { DatabaseFactory, DatabaseType } from '../adapters/database-factory'
import { DatabaseAdapter, QueryResult } from '../types'

export class DatabaseService {
  private static instance: DatabaseService | null = null
  private adapter: DatabaseAdapter | null = null

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService()
    }
    return this.instance
  }

  async initialize(type?: DatabaseType): Promise<void> {
    try {
      const dbType = type || (process.env.DB_TYPE as DatabaseType) || 'json-server'
      
      let config: any
      switch (dbType) {
        case 'json-server':
          config = DatabaseFactory.getJsonServerConfig()
          break
        case 'db2':
          // Verificar se é ambiente VPN
          if (process.env.DB2_VPN_HOST) {
            config = DatabaseFactory.getDB2VPNConfig()
          } else {
            config = DatabaseFactory.getDB2Config()
          }
          break
      }

      this.adapter = await DatabaseFactory.getInstance(dbType, config)
      console.log(`✅ DatabaseService inicializado com ${dbType}`)
    } catch (error) {
      console.error('❌ Erro ao inicializar DatabaseService:', error)
      throw error
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.adapter) {
      throw new Error('DatabaseService não foi inicializado')
    }

    try {
      console.log(`🔍 Executando query: ${sql}`)
      const result = await this.adapter.query(sql)
      console.log(`✅ Query executada com sucesso: ${result.rowCount} linhas retornadas`)
      return result
    } catch (error) {
      console.error('❌ Erro ao executar query:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.adapter) {
      return false
    }

    try {
      return await this.adapter.testConnection()
    } catch {
      return false
    }
  }

  async switchDatabase(type: DatabaseType): Promise<void> {
    try {
      let config: any
      switch (type) {
        case 'json-server':
          config = DatabaseFactory.getJsonServerConfig()
          break
        case 'db2':
          if (process.env.DB2_VPN_HOST) {
            config = DatabaseFactory.getDB2VPNConfig()
          } else {
            config = DatabaseFactory.getDB2Config()
          }
          break
      }

      this.adapter = await DatabaseFactory.switchDatabase(type, config)
      console.log(`✅ Banco de dados alterado para: ${type}`)
    } catch (error) {
      console.error(`❌ Erro ao alterar banco para ${type}:`, error)
      throw error
    }
  }

  getCurrentDatabaseType(): DatabaseType | null {
    return DatabaseFactory.getCurrentType()
  }

  async getDatabaseInfo(): Promise<any> {
    const info = await DatabaseFactory.getDatabaseInfo()
    return {
      ...info,
      service: 'DatabaseService',
      initialized: this.adapter !== null
    }
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      await DatabaseFactory.disconnect()
      this.adapter = null
      console.log('🔌 DatabaseService desconectado')
    }
  }

  // Métodos específicos para queries universitárias
  async getUniversidades(filters?: any): Promise<QueryResult> {
    let sql = 'SELECT * FROM universidades'
    
    if (filters) {
      const conditions = []
      if (filters.tipo) conditions.push(`tipo = '${filters.tipo}'`)
      if (filters.regiao) conditions.push(`regiao = '${filters.regiao}'`)
      if (filters.nome) conditions.push(`nome LIKE '%${filters.nome}%'`)
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`
      }
    }

    if (filters?.limit) {
      sql += ` LIMIT ${filters.limit}`
    }

    return this.executeQuery(sql)
  }

  async getPessoas(filters?: any): Promise<QueryResult> {
    let sql = 'SELECT * FROM pessoas'
    
    if (filters) {
      const conditions = []
      if (filters.tipo) conditions.push(`tipo = '${filters.tipo}'`)
      if (filters.universidade_id) conditions.push(`universidade_id = ${filters.universidade_id}`)
      if (filters.nome) conditions.push(`nome LIKE '%${filters.nome}%'`)
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`
      }
    }

    if (filters?.limit) {
      sql += ` LIMIT ${filters.limit}`
    }

    return this.executeQuery(sql)
  }

  async getCursos(filters?: any): Promise<QueryResult> {
    let sql = 'SELECT * FROM cursos'
    
    if (filters) {
      const conditions = []
      if (filters.tipo) conditions.push(`tipo = '${filters.tipo}'`)
      if (filters.universidade_id) conditions.push(`universidade_id = ${filters.universidade_id}`)
      if (filters.nome) conditions.push(`nome LIKE '%${filters.nome}%'`)
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`
      }
    }

    if (filters?.limit) {
      sql += ` LIMIT ${filters.limit}`
    }

    return this.executeQuery(sql)
  }

  // Método para executar queries complexas geradas por LLM
  async executeLLMQuery(sql: string, context?: any): Promise<QueryResult> {
    try {
      // Validar e sanitizar SQL se necessário
      const sanitizedSQL = this.sanitizeSQL(sql)
      
      // Adicionar contexto se fornecido
      if (context?.limit && !sanitizedSQL.toLowerCase().includes('limit')) {
        sql += ` LIMIT ${context.limit}`
      }

      return this.executeQuery(sanitizedSQL)
    } catch (error) {
      console.error('❌ Erro ao executar query LLM:', error)
      throw error
    }
  }

  private sanitizeSQL(sql: string): string {
    // Implementar sanitização básica
    // TODO: Adicionar validações mais robustas
    return sql.trim()
  }
}
