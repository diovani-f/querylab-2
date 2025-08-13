import { Router } from 'express'
import { DatabaseService } from '../services/database-service'
import { QueryDatabaseService } from '../services/query-database-service'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'QueryLab Backend',
    version: '1.0.0'
  })
})

router.get('/database', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance()
    const isConnected = await dbService.testConnection()
    const dbInfo = await dbService.getDatabaseInfo()

    res.json({
      status: isConnected ? 'ok' : 'error',
      connected: isConnected,
      type: dbService.getCurrentDatabaseType(),
      ...dbInfo
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      connected: false,
      error: 'Erro ao verificar conexão com banco de dados'
    })
  }
})

// Nova rota para verificar status completo (aplicação + consultas)
router.get('/status', async (req, res) => {
  try {
    // Status do banco da aplicação (JSON Server)
    const dbService = DatabaseService.getInstance()
    const appDbConnected = await dbService.testConnection()
    const appDbInfo = await dbService.getDatabaseInfo()

    // Status do banco de consultas (DB2)
    const queryDbService = QueryDatabaseService.getInstance()
    const queryDbConnected = await queryDbService.testConnection()
    const queryDbStatus = queryDbService.getStatus()

    res.json({
      status: appDbConnected && queryDbConnected ? 'ok' : 'partial',
      timestamp: new Date().toISOString(),
      services: {
        application: {
          status: appDbConnected ? 'ok' : 'error',
          connected: appDbConnected,
          type: dbService.getCurrentDatabaseType(),
          ...appDbInfo
        },
        queries: {
          status: queryDbConnected ? 'ok' : 'error',
          connected: queryDbConnected,
          type: queryDbStatus.queryDbType,
          initialized: queryDbStatus.isInitialized
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Erro ao verificar status dos serviços',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router
