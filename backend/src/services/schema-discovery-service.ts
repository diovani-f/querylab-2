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
   * Agora inclui informações semânticas e de relevância
   */
  private optimizeSchemaForLLM(schemaData: any): any {
    if (!schemaData || !schemaData.tables) {
      return schemaData
    }

    // Priorizar tabelas por relevância e categoria
    const prioritizedTables = this.prioritizeTablesByRelevance(schemaData.tables)

    // Limitar número de tabelas para não sobrecarregar o LLM
    const maxTables = 60 // Aumentado para incluir mais contexto
    const tables = prioritizedTables.slice(0, maxTables)

    // Otimizar informações de cada tabela com dados semânticos
    const optimizedTables = tables.map((table: any) => ({
      name: table.name,
      type: table.type,
      category: table.category || 'other',
      description: table.description || `Tabela ${table.name}`,
      keywords: (table.keywords || []).slice(0, 8),
      columnCount: table.columnCount,
      primaryKeys: table.primaryKeys || [],
      columns: table.columns || [],

      // Colunas chave com metadados semânticos
      keyColumns: (table.keyColumns || []).slice(0, 6).map((col: any) => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable,
        isPrimaryKey: col.isPrimaryKey || false,
        isIdentifier: col.isIdentifier || false
      })),

      // Colunas importantes com tipos semânticos
      importantColumns: (table.importantColumns || []).slice(0, 12).map((col: any) => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable,
        semanticType: col.semanticType || 'other'
      })),

      // Scores de relevância para diferentes domínios
      relevanceScores: table.relevanceScores || {
        students: 0,
        courses: 0,
        institutions: 0,
        performance: 0,
        demographics: 0
      },

      // Indicadores de qualidade dos dados
      dataQuality: {
        hasTemporalData: table.dataQuality?.hasTemporalData || false,
        hasGeographicData: table.dataQuality?.hasGeographicData || false,
        estimatedSize: table.dataQuality?.estimatedSize || 'medium'
      },

      sampleDataAvailable: table.sampleDataAvailable || false
    }))

    return {
      schemaName: schemaData.schemaName,
      totalTables: schemaData.totalTables,
      processedTables: optimizedTables.length,
      discoveredAt: schemaData.discoveredAt,
      tables: optimizedTables,
      relationships: (schemaData.relationships || []).slice(0, 25), // Máximo 25 relacionamentos

      // Estatísticas do schema otimizado
      optimization: {
        originalTableCount: schemaData.totalTables,
        optimizedTableCount: optimizedTables.length,
        reductionRatio: `${optimizedTables.length}/${schemaData.totalTables}`,
        categoriesIncluded: [...new Set(optimizedTables.map((t: any) => t.category))]
      }
    }
  }

  /**
   * Prioriza tabelas por relevância geral e diversidade de categorias
   */
  private prioritizeTablesByRelevance(tables: any[]): any[] {
    // Calcular score geral de relevância para cada tabela
    const tablesWithScores = tables.map(table => {
      const relevanceScores = table.relevanceScores || {}
      const totalRelevance = Object.values(relevanceScores).reduce((sum: number, score: any) => sum + (score || 0), 0)

      // Bonus para tabelas com dados temporais e geográficos
      let bonus = 0
      if (table.dataQuality?.hasTemporalData) bonus += 2
      if (table.dataQuality?.hasGeographicData) bonus += 1
      if (table.primaryKeys && table.primaryKeys.length > 0) bonus += 1

      // Penalty para tabelas muito grandes sem relevância específica
      let penalty = 0
      if (table.dataQuality?.estimatedSize === 'large' && totalRelevance < 5) penalty = 2

      return {
        ...table,
        overallScore: totalRelevance + bonus - penalty
      }
    })

    // Ordenar por score e garantir diversidade de categorias
    const sorted = tablesWithScores.sort((a, b) => b.overallScore - a.overallScore)

    // Garantir que temos representação de todas as categorias importantes
    const prioritized: any[] = []
    const categoriesUsed = new Set<string>()
    const importantCategories = ['students', 'courses', 'institutions', 'performance', 'census']

    // Primeiro, garantir pelo menos uma tabela de cada categoria importante
    importantCategories.forEach(category => {
      const tableFromCategory = sorted.find(t => t.category === category && !prioritized.includes(t))
      if (tableFromCategory) {
        prioritized.push(tableFromCategory)
        categoriesUsed.add(category)
      }
    })

    // Depois, adicionar as demais por score
    sorted.forEach(table => {
      if (!prioritized.includes(table)) {
        prioritized.push(table)
      }
    })

    return prioritized
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
