import { SchemaDiscoveryService } from './schema-discovery-service'

export interface SmartSchemaReductionRequest {
  question: string
  schemaName?: string
  maxTables?: number
  includeRelationships?: boolean
}

export interface SmartSchemaReductionResult {
  success: boolean
  reducedSchema?: string
  selectedTables?: string[]
  reasoning?: string
  error?: string
  processingTime: number
}

export interface TableRelevance {
  tableName: string
  relevanceScore: number
  reasons: string[]
  category: string
  keywords: string[]
}

export class SmartSchemaReducer {
  private static instance: SmartSchemaReducer
  private schemaService: SchemaDiscoveryService

  private constructor() {
    this.schemaService = SchemaDiscoveryService.getInstance()
  }

  static getInstance(): SmartSchemaReducer {
    if (!SmartSchemaReducer.instance) {
      SmartSchemaReducer.instance = new SmartSchemaReducer()
    }
    return SmartSchemaReducer.instance
  }

  /**
   * Reduz schema de forma inteligente baseado na pergunta
   */
  async reduceSchema(request: SmartSchemaReductionRequest): Promise<SmartSchemaReductionResult> {
    const startTime = Date.now()

    try {
      console.log('🧠 Iniciando redução inteligente de schema...')

      // 1. Obter schema completo
      const fullSchema = await this.schemaService.getSchemaForLLM(request.schemaName || 'inep')
      if (!fullSchema || !fullSchema.tables) {
        return {
          success: false,
          error: 'Schema não encontrado',
          processingTime: Date.now() - startTime
        }
      }

      // 2. Analisar pergunta e extrair intenção
      const queryIntent = this.analyzeQueryIntent(request.question)
      console.log('🎯 Intenção da query:', queryIntent)

      // 3. Calcular relevância das tabelas
      const tableRelevances = this.calculateTableRelevances(
        fullSchema.tables,
        request.question,
        queryIntent
      )

      // 4. Selecionar tabelas mais relevantes
      const maxTables = request.maxTables || 15
      const selectedTables = this.selectBestTables(tableRelevances, maxTables)
      console.log(`📊 Selecionadas ${selectedTables.length} tabelas de ${fullSchema.tables.length}`)

      // 5. Construir schema reduzido
      const reducedSchema = this.buildReducedSchema(
        fullSchema,
        selectedTables,
        request.includeRelationships
      )

      // 6. Gerar explicação do raciocínio
      const reasoning = this.generateReasoning(selectedTables, queryIntent)

      return {
        success: true,
        reducedSchema: JSON.stringify(reducedSchema, null, 2),
        selectedTables: selectedTables.map(t => t.tableName),
        reasoning,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      console.error('❌ Erro na redução inteligente de schema:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Analisa a pergunta para extrair intenção e palavras-chave
   */
  private analyzeQueryIntent(question: string): {
    domains: string[]
    keywords: string[]
    temporalScope: string[]
    geographicScope: string[]
    aggregationType: string | null
  } {
    const lowerQuestion = question.toLowerCase()
    const words = lowerQuestion.split(/\s+/)

    // Detectar domínios
    const domains: string[] = []
    if (this.containsAny(lowerQuestion, ['aluno', 'estudante', 'discente', 'matricula'])) {
      domains.push('students')
    }
    if (this.containsAny(lowerQuestion, ['curso', 'programa', 'graduação', 'bacharelado'])) {
      domains.push('courses')
    }
    if (this.containsAny(lowerQuestion, ['instituição', 'universidade', 'faculdade', 'ies'])) {
      domains.push('institutions')
    }
    if (this.containsAny(lowerQuestion, ['enade', 'nota', 'avaliação', 'desempenho', 'conceito'])) {
      domains.push('performance')
    }
    if (this.containsAny(lowerQuestion, ['município', 'estado', 'região', 'uf', 'cidade'])) {
      domains.push('demographics')
    }

    // Extrair palavras-chave relevantes
    const keywords = words.filter(word =>
      word.length > 3 &&
      !this.isStopWord(word) &&
      !this.isCommonWord(word)
    )

    // Detectar escopo temporal
    const temporalScope: string[] = []
    const yearMatches = lowerQuestion.match(/\b(20\d{2})\b/g)
    if (yearMatches) {
      temporalScope.push(...yearMatches)
    }
    if (this.containsAny(lowerQuestion, ['último', 'recente', 'atual'])) {
      temporalScope.push('recent')
    }

    // Detectar escopo geográfico
    const geographicScope: string[] = []
    if (this.containsAny(lowerQuestion, ['brasil', 'nacional'])) {
      geographicScope.push('national')
    }
    if (this.containsAny(lowerQuestion, ['região', 'regional'])) {
      geographicScope.push('regional')
    }
    if (this.containsAny(lowerQuestion, ['estado', 'estadual', 'uf'])) {
      geographicScope.push('state')
    }

    // Detectar tipo de agregação
    let aggregationType: string | null = null
    if (this.containsAny(lowerQuestion, ['total', 'soma', 'somar'])) {
      aggregationType = 'sum'
    } else if (this.containsAny(lowerQuestion, ['média', 'médio'])) {
      aggregationType = 'average'
    } else if (this.containsAny(lowerQuestion, ['contar', 'quantidade', 'número'])) {
      aggregationType = 'count'
    } else if (this.containsAny(lowerQuestion, ['máximo', 'maior'])) {
      aggregationType = 'max'
    } else if (this.containsAny(lowerQuestion, ['mínimo', 'menor'])) {
      aggregationType = 'min'
    }

    return {
      domains,
      keywords,
      temporalScope,
      geographicScope,
      aggregationType
    }
  }

  /**
   * Calcula relevância de cada tabela baseado na pergunta
   */
  private calculateTableRelevances(
    tables: any[],
    question: string,
    queryIntent: any
  ): TableRelevance[] {
    return tables.map(table => {
      let score = 0
      const reasons: string[] = []

      // Score baseado nos domínios identificados
      queryIntent.domains.forEach((domain: string) => {
        const domainScore = table.relevanceScores?.[domain] || 0
        if (domainScore > 0) {
          score += domainScore * 2 // Peso alto para domínios
          reasons.push(`Relevante para domínio ${domain} (${domainScore}/10)`)
        }
      })

      // Score baseado em palavras-chave
      const tableKeywords = table.keywords || []
      queryIntent.keywords.forEach((keyword: string) => {
        if (tableKeywords.some((tk: string) => tk.includes(keyword) || keyword.includes(tk))) {
          score += 3
          reasons.push(`Contém palavra-chave: ${keyword}`)
        }
      })

      // Score baseado no nome da tabela
      const tableName = table.name.toLowerCase()
      queryIntent.keywords.forEach((keyword: string) => {
        const cleanKeyword = keyword.replace(/[(),.?]/g, '').toLowerCase()
        if (cleanKeyword.length < 3) return

        if (tableName.includes(cleanKeyword)) {
          score += 5
          reasons.push(`Nome da tabela contém: ${cleanKeyword}`)
        }
      })

      // Score baseado nos nomes das colunas
      const columns = table.columns || [];
      queryIntent.keywords.forEach((keyword: string) => {
        const cleanKeyword = keyword.replace(/[(),.?]/g, '').toLowerCase()
        if (cleanKeyword.length < 4) return

        // As colunas vêm em string "nome_coluna:tipo" ou "nome_coluna". Vamos pegar só o nome.
        const matchingCols = columns.filter((colStr: string) => {
          const colName = colStr.split(':')[0].toLowerCase();
          return colName.includes(cleanKeyword);
        });

        if (matchingCols.length > 0) {
          score += 3 * matchingCols.length;
          reasons.push(`Contém ${matchingCols.length} coluna(s) relacionada(s) a: ${cleanKeyword}`);
        }
      })

      // Bonus para tabelas com dados temporais se pergunta menciona anos
      if (queryIntent.temporalScope.length > 0 && table.dataQuality?.hasTemporalData) {
        score += 2
        reasons.push('Contém dados temporais')
      }

      // Bonus para tabelas com dados geográficos se pergunta menciona localização
      if (queryIntent.geographicScope.length > 0 && table.dataQuality?.hasGeographicData) {
        score += 2
        reasons.push('Contém dados geográficos')
      }

      // Penalty para tabelas muito grandes se não for necessário
      if (table.dataQuality?.estimatedSize === 'large' && !queryIntent.aggregationType) {
        score -= 1
        reasons.push('Tabela grande - pode ser lenta')
      }

      return {
        tableName: table.name,
        relevanceScore: Math.max(0, score),
        reasons,
        category: table.category || 'other',
        keywords: table.keywords || []
      }
    })
  }

  /**
   * Seleciona as melhores tabelas baseado na relevância
   */
  private selectBestTables(
    tableRelevances: TableRelevance[],
    maxTables: number
  ): TableRelevance[] {
    // Ordenar por relevância
    const sorted = tableRelevances
      .filter(t => t.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Garantir diversidade de categorias
    const selected: TableRelevance[] = []
    const categoriesUsed = new Set<string>()

    // Primeiro, pegar as mais relevantes de cada categoria
    for (const table of sorted) {
      if (selected.length >= maxTables) break

      if (!categoriesUsed.has(table.category) || selected.length < maxTables / 2) {
        selected.push(table)
        categoriesUsed.add(table.category)
      }
    }

    // Completar com as mais relevantes restantes
    for (const table of sorted) {
      if (selected.length >= maxTables) break

      if (!selected.find(s => s.tableName === table.tableName)) {
        selected.push(table)
      }
    }

    return selected.slice(0, maxTables)
  }

  /**
   * Constrói schema reduzido com as tabelas selecionadas
   */
  private buildReducedSchema(
    fullSchema: any,
    selectedTables: TableRelevance[],
    includeRelationships: boolean = true
  ): any {
    const selectedTableNames = new Set(selectedTables.map(t => t.tableName))

    // ---------------------------------------------------------
    // GARANTIA DE TABELAS CORE E CADEIA GEOGRÁFICA
    // Isso evita que a IA alucine joins ou falhe na regra de ouro
    // ---------------------------------------------------------
    const coreTables = [
      'censo_ies',
      'censo_cursos',
      'municipios_ibge',
      'microregioes_ibge',
      'mesoregioes_ibge',
      'uf_ibge',
      'regioes_ibge'
    ];

    coreTables.forEach(t => selectedTableNames.add(t));

    const reducedTables = fullSchema.tables.filter((table: any) =>
      selectedTableNames.has(table.name)
    )

    const result: any = {
      schemaName: fullSchema.schemaName,
      totalTables: reducedTables.length,
      originalTotalTables: fullSchema.totalTables,
      tables: reducedTables,
      reductionRatio: `${reducedTables.length}/${fullSchema.totalTables}`,
      discoveredAt: fullSchema.discoveredAt
    }

    if (includeRelationships && fullSchema.relationships) {
      // Incluir apenas relacionamentos entre tabelas selecionadas
      result.relationships = fullSchema.relationships.filter((rel: any) =>
        selectedTableNames.has(rel.fromTable) && selectedTableNames.has(rel.toTable)
      )
    }

    return result
  }

  /**
   * Gera explicação do raciocínio da seleção
   */
  private generateReasoning(selectedTables: TableRelevance[], queryIntent: any): string {
    const topTables = selectedTables.slice(0, 5)

    let reasoning = `Selecionei ${selectedTables.length} tabelas baseado na análise da pergunta:\n\n`

    reasoning += `**Domínios identificados:** ${queryIntent.domains.join(', ') || 'Nenhum específico'}\n`
    reasoning += `**Palavras-chave:** ${queryIntent.keywords.join(', ')}\n\n`

    reasoning += `**Top 5 tabelas mais relevantes:**\n`
    topTables.forEach((table, index) => {
      reasoning += `${index + 1}. **${table.tableName}** (Score: ${table.relevanceScore})\n`
      reasoning += `   - ${table.reasons.join('\n   - ')}\n\n`
    })

    return reasoning
  }

  // Métodos auxiliares
  private containsAny(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term))
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'com', 'por', 'para', 'que', 'qual', 'como', 'onde', 'quando']
    return stopWords.includes(word)
  }

  private isCommonWord(word: string): boolean {
    const commonWords = ['dados', 'informações', 'tabela', 'banco', 'sistema', 'total', 'lista', 'mostrar', 'buscar']
    return commonWords.includes(word)
  }
}
