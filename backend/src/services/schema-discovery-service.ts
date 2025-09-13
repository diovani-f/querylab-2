import fs from 'fs'
import path from 'path'

/**
 * Serviço para gerenciar schema discovery e fornecer informações de schema para o LLM
 */
export class SchemaDiscoveryService {
  private static instance: SchemaDiscoveryService
  private schemaCache: Map<string, any> = new Map()
  private readonly schemaDir: string

  private constructor() {
    this.schemaDir = path.join(process.cwd(), 'data', 'schema-discovery');
  }

  public static getInstance(): SchemaDiscoveryService {
    if (!SchemaDiscoveryService.instance) {
      SchemaDiscoveryService.instance = new SchemaDiscoveryService()
    }
    return SchemaDiscoveryService.instance
  }

  /**
   * Obtém schema otimizado para LLM
   */
  async getSchemaForLLM(schemaName: string = 'inep'): Promise<any> {
    try {
      // Verificar cache primeiro
      const cacheKey = `${schemaName.toLowerCase()}-llm`
      if (this.schemaCache.has(cacheKey)) {
        return this.schemaCache.get(cacheKey)
      }

      // Tentar carregar schema summary
      const summaryPath = path.join(this.schemaDir, `${schemaName.toLowerCase()}-schema-summary.json`)

      if (!fs.existsSync(summaryPath)) {
        console.warn(`⚠️ Schema summary não encontrado: ${summaryPath}`)
        return null
      }

      const schemaData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))

      // Processar e otimizar para LLM
      const optimizedSchema = this.optimizeSchemaForLLM(schemaData)

      // Cachear resultado
      this.schemaCache.set(cacheKey, optimizedSchema)

      return optimizedSchema

    } catch (error) {
      console.error(`❌ Erro ao carregar schema ${schemaName}:`, error)
      return null
    }
  }

  /**
   * Obtém schema completo
   */
  async getFullSchema(schemaName: string = 'inep'): Promise<any> {
    try {
      const fullPath = path.join(this.schemaDir, `${schemaName.toLowerCase()}-schema-full.json`)

      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Schema completo não encontrado: ${fullPath}`)
        return null
      }

      return JSON.parse(fs.readFileSync(fullPath, 'utf8'))

    } catch (error) {
      console.error(`❌ Erro ao carregar schema completo ${schemaName}:`, error)
      return null
    }
  }

  /**
   * Lista schemas disponíveis
   */
  getAvailableSchemas(): string[] {
    try {
      if (!fs.existsSync(this.schemaDir)) {
        return []
      }

      const files = fs.readdirSync(this.schemaDir)
      const schemas = files
        .filter(file => file.endsWith('-schema-summary.json'))
        .map(file => file.replace('-schema-summary.json', '').toUpperCase())

      return schemas

    } catch (error) {
      console.error('❌ Erro ao listar schemas:', error)
      return []
    }
  }

  /**
   * Verifica se um schema está disponível
   */
  isSchemaAvailable(schemaName: string): boolean {
    const summaryPath = path.join(this.schemaDir, `${schemaName.toLowerCase()}-schema-summary.json`)
    return fs.existsSync(summaryPath)
  }

  /**
   * Obtém informações de uma tabela específica
   */
  async getTableInfo(schemaName: string, tableName: string): Promise<any> {
    try {
      const schema = await this.getFullSchema(schemaName)
      if (!schema || !schema.tables) {
        return null
      }

      const table = schema.tables.find((t: any) =>
        t.name.toLowerCase() === tableName.toLowerCase()
      )

      return table || null

    } catch (error) {
      console.error(`❌ Erro ao obter informações da tabela ${tableName}:`, error)
      return null
    }
  }

  /**
   * Busca tabelas por padrão de nome
   */
  async searchTables(schemaName: string, pattern: string): Promise<any[]> {
    try {
      const schema = await this.getSchemaForLLM(schemaName)
      if (!schema || !schema.tables) {
        return []
      }

      const searchPattern = pattern.toLowerCase()
      return schema.tables.filter((table: any) =>
        table.name.toLowerCase().includes(searchPattern) ||
        (table.comment && table.comment.toLowerCase().includes(searchPattern))
      )

    } catch (error) {
      console.error(`❌ Erro ao buscar tabelas com padrão ${pattern}:`, error)
      return []
    }
  }

  /**
   * Limpa cache de schemas
   */
  clearCache(): void {
    this.schemaCache.clear()
    console.log('🧹 Cache de schemas limpo')
  }

  /**
   * Otimiza schema para uso com LLM
   */
  private optimizeSchemaForLLM(schemaData: any): any {
    if (!schemaData || !schemaData.tables) {
      return schemaData
    }

    // Limitar número de tabelas para não sobrecarregar o LLM
    const maxTables = 50
    const tables = schemaData.tables.slice(0, maxTables)

    // Otimizar informações de cada tabela
    const optimizedTables = tables.map((table: any) => ({
      name: table.name,
      type: table.type,
      comment: table.comment,
      columnCount: table.columnCount,
      primaryKeys: table.primaryKeys || [],
      keyColumns: (table.keyColumns || []).slice(0, 5), // Máximo 5 colunas chave
      importantColumns: (table.importantColumns || []).slice(0, 10), // Máximo 10 colunas importantes
      sampleDataAvailable: table.sampleDataAvailable || false
    }))

    return {
      schemaName: schemaData.schemaName,
      totalTables: schemaData.totalTables,
      discoveredAt: schemaData.discoveredAt,
      tables: optimizedTables,
      relationships: (schemaData.relationships || []).slice(0, 20) // Máximo 20 relacionamentos
    }
  }

  /**
   * Obtém estatísticas do schema
   */
  async getSchemaStats(schemaName: string = 'inep'): Promise<any> {
    try {
      const schema = await this.getSchemaForLLM(schemaName)
      if (!schema) {
        return null
      }

      const stats = {
        schemaName: schema.schemaName,
        totalTables: schema.totalTables,
        processedTables: schema.tables.length,
        discoveredAt: schema.discoveredAt,
        tablesWithPrimaryKeys: schema.tables.filter((t: any) => t.primaryKeys && t.primaryKeys.length > 0).length,
        tablesWithSampleData: schema.tables.filter((t: any) => t.sampleDataAvailable).length,
        totalRelationships: schema.relationships ? schema.relationships.length : 0,
        averageColumnsPerTable: Math.round(
          schema.tables.reduce((sum: number, t: any) => sum + t.columnCount, 0) / schema.tables.length
        )
      }

      return stats

    } catch (error) {
      console.error(`❌ Erro ao obter estatísticas do schema ${schemaName}:`, error)
      return null
    }
  }

  /**
   * Recarrega schema do disco
   */
  async reloadSchema(schemaName: string): Promise<boolean> {
    try {
      const cacheKey = `${schemaName.toLowerCase()}-llm`
      this.schemaCache.delete(cacheKey)

      const schema = await this.getSchemaForLLM(schemaName)
      return schema !== null

    } catch (error) {
      console.error(`❌ Erro ao recarregar schema ${schemaName}:`, error)
      return false
    }
  }
}
