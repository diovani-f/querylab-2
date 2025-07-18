import { Router } from 'express'
import { DatabaseService } from '../services/database-service'

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

export default router
