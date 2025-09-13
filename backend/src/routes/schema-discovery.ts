import { Router } from 'express'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { authMiddleware } from '../middleware/auth-middleware'
import { SchemaDiscoveryService } from '../services/schema-discovery-service'

const router = Router()

// Instância do serviço de schema discovery
const schemaService = SchemaDiscoveryService.getInstance()

// Configurações do proxy DB2
const PROXY_URL = process.env.DB2_PROXY_URL || 'http://localhost:3002'
const PROXY_SECRET = process.env.DB2_PROXY_SECRET || 'sua_chave_secreta_super_forte_123456'

// Cliente HTTP configurado
const proxyClient = axios.create({
  baseURL: PROXY_URL,
  headers: {
    'Authorization': `Bearer ${PROXY_SECRET}`,
    'Content-Type': 'application/json'
  },
  timeout: 120000 // 2 minutos
})

/**
 * Descobrir schema de um banco DB2
 */
router.post('/discover/:schemaName', authMiddleware, async (req, res) => {
  try {
    const { schemaName } = req.params
    const { saveToFile = true } = req.body

    console.log(`🔍 Iniciando descoberta do schema ${schemaName}...`)

    // Verificar se o proxy está funcionando
    try {
      await proxyClient.get('/health')
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de banco de dados temporariamente indisponível. Tente novamente em alguns minutos.'
      })
    }

    // Descobrir o schema
    const schemaResponse = await proxyClient.get(`/schema/${schemaName}`)

    if (!schemaResponse.data.success) {
      return res.status(400).json({
        success: false,
        error: schemaResponse.data.error
      })
    }

    const schemaInfo = schemaResponse.data.data

    // Salvar em arquivo se solicitado
    if (saveToFile) {
      const outputDir = path.join(__dirname, '..', 'data', 'schema-discovery')
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      // Salvar schema completo
      const fullSchemaPath = path.join(outputDir, `${schemaName.toLowerCase()}-schema-full.json`)
      fs.writeFileSync(fullSchemaPath, JSON.stringify(schemaInfo, null, 2))

      // Criar resumo para IA
      const aiSummary = createAISummary(schemaInfo)
      const summaryPath = path.join(outputDir, `${schemaName.toLowerCase()}-schema-summary.json`)
      fs.writeFileSync(summaryPath, JSON.stringify(aiSummary, null, 2))

      console.log(`💾 Schema ${schemaName} salvo em: ${outputDir}`)
    }

    res.json({
      success: true,
      data: {
        schema: schemaInfo,
        summary: createAISummary(schemaInfo),
        savedToFile: saveToFile
      }
    })

  } catch (error) {
    console.error('❌ Erro na descoberta do schema:', error)

    res.status(500).json({
      success: false,
      error: 'Erro interno do sistema. Nossa equipe foi notificada.'
    })
  }
})

/**
 * Listar schemas salvos
 */
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const outputDir = path.join(__dirname, '..', 'data', 'schema-discovery')

    if (!fs.existsSync(outputDir)) {
      return res.json({
        success: true,
        data: []
      })
    }

    const files = fs.readdirSync(outputDir)
    const schemas = files
      .filter(file => file.endsWith('-schema-summary.json'))
      .map(file => {
        const schemaName = file.replace('-schema-summary.json', '').toUpperCase()
        const filePath = path.join(outputDir, file)
        const stats = fs.statSync(filePath)

        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          return {
            name: schemaName,
            totalTables: content.totalTables,
            discoveredAt: content.discoveredAt,
            fileSize: stats.size,
            lastModified: stats.mtime
          }
        } catch (parseError) {
          return {
            name: schemaName,
            error: 'Erro ao ler arquivo',
            lastModified: stats.mtime
          }
        }
      })

    res.json({
      success: true,
      data: schemas
    })

  } catch (error) {
    console.error('❌ Erro ao listar schemas salvos:', error)

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Obter schema salvo
 */
router.get('/saved/:schemaName', authMiddleware, async (req, res) => {
  try {
    const { schemaName } = req.params
    const { type = 'summary' } = req.query

    const outputDir = path.join(__dirname, '..', 'data', 'schema-discovery')
    const fileName = type === 'full'
      ? `${schemaName.toLowerCase()}-schema-full.json`
      : `${schemaName.toLowerCase()}-schema-summary.json`

    const filePath = path.join(outputDir, fileName)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: `Schema ${schemaName} não encontrado`
      })
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))

    res.json({
      success: true,
      data: content
    })

  } catch (error) {
    console.error('❌ Erro ao obter schema salvo:', error)

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Criar resumo otimizado para IA
 */
function createAISummary(schemaInfo: any) {
  return {
    schemaName: schemaInfo.schemaName,
    totalTables: schemaInfo.totalTables,
    discoveredAt: schemaInfo.discoveredAt,
    tables: schemaInfo.tables.map((table: any) => ({
      name: table.name,
      type: table.type,
      comment: table.comment,
      columnCount: table.columns.length,
      primaryKeys: table.primaryKeys,
      keyColumns: table.columns
        .filter((col: any) => table.primaryKeys.includes(col.name) || col.name.toLowerCase().includes('id'))
        .map((col: any) => ({
          name: col.name,
          dataType: col.dataType,
          nullable: col.nullable
        })),
      importantColumns: table.columns
        .filter((col: any) =>
          col.name.toLowerCase().includes('nome') ||
          col.name.toLowerCase().includes('descricao') ||
          col.name.toLowerCase().includes('codigo') ||
          col.name.toLowerCase().includes('data') ||
          col.name.toLowerCase().includes('ano') ||
          col.name.toLowerCase().includes('valor') ||
          col.name.toLowerCase().includes('numero')
        )
        .map((col: any) => ({
          name: col.name,
          dataType: col.dataType,
          nullable: col.nullable,
          comment: col.comment
        })),
      sampleDataAvailable: table.sampleData && table.sampleData.length > 0
    })),
    relationships: findPotentialRelationships(schemaInfo.tables)
  }
}

/**
 * Encontrar relacionamentos potenciais entre tabelas
 */
function findPotentialRelationships(tables: any[]) {
  const relationships: any[] = []

  tables.forEach(table => {
    table.columns.forEach((column: any) => {
      // Procurar por colunas que podem ser chaves estrangeiras
      if (column.name.toLowerCase().includes('id') && !table.primaryKeys.includes(column.name)) {
        // Tentar encontrar tabela relacionada
        const potentialTable = column.name.replace(/[_]?id$/i, '').toLowerCase()
        const relatedTable = tables.find(t =>
          t.name.toLowerCase().includes(potentialTable) ||
          potentialTable.includes(t.name.toLowerCase())
        )

        if (relatedTable) {
          relationships.push({
            fromTable: table.name,
            fromColumn: column.name,
            toTable: relatedTable.name,
            type: 'potential_foreign_key'
          })
        }
      }
    })
  })

  return relationships
}

/**
 * Obter schema otimizado para LLM
 */
router.get('/llm/:schemaName', authMiddleware, async (req, res) => {
  try {
    const { schemaName } = req.params

    const schema = await schemaService.getSchemaForLLM(schemaName)

    if (!schema) {
      return res.status(404).json({
        success: false,
        error: `Schema ${schemaName} não encontrado ou não disponível`
      })
    }

    res.json({
      success: true,
      data: schema
    })

  } catch (error) {
    console.error('❌ Erro ao obter schema para LLM:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Obter estatísticas do schema
 */
router.get('/stats/:schemaName', authMiddleware, async (req, res) => {
  try {
    const { schemaName } = req.params

    const stats = await schemaService.getSchemaStats(schemaName)

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: `Estatísticas do schema ${schemaName} não disponíveis`
      })
    }

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas do schema:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Buscar tabelas por padrão
 */
router.get('/search/:schemaName', authMiddleware, async (req, res) => {
  try {
    const { schemaName } = req.params
    const { pattern } = req.query

    if (!pattern || typeof pattern !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro pattern é obrigatório'
      })
    }

    const tables = await schemaService.searchTables(schemaName, pattern)

    res.json({
      success: true,
      data: {
        pattern,
        tablesFound: tables.length,
        tables
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar tabelas:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Listar schemas disponíveis (sem autenticação para teste)
 */
router.get('/available', async (req, res) => {
  try {
    const schemas = schemaService.getAvailableSchemas()

    res.json({
      success: true,
      data: {
        count: schemas.length,
        schemas
      }
    })

  } catch (error) {
    console.error('❌ Erro ao listar schemas disponíveis:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Recarregar schema do disco
 */
router.post('/reload/:schemaName', authMiddleware, async (req, res) => {
  try {
    const { schemaName } = req.params

    const success = await schemaService.reloadSchema(schemaName)

    if (!success) {
      return res.status(404).json({
        success: false,
        error: `Não foi possível recarregar o schema ${schemaName}`
      })
    }

    res.json({
      success: true,
      message: `Schema ${schemaName} recarregado com sucesso`
    })

  } catch (error) {
    console.error('❌ Erro ao recarregar schema:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router
