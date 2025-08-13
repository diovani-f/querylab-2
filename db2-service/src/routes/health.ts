import { Router, type Router as RouterType } from 'express'
import { DB2Service } from '../services/db2-service'

export const healthRoutes: RouterType = Router()

// Health check básico
healthRoutes.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DB2 Service'
  })
})

// Health check detalhado
healthRoutes.get('/detailed', async (req, res) => {
  try {
    const db2Service = DB2Service.getInstance()
    const connectionInfo = db2Service.getConnectionInfo()
    const isConnected = await db2Service.testConnection()

    res.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'DB2 Service',
      database: {
        ...connectionInfo,
        isConnected
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'DB2 Service',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})
