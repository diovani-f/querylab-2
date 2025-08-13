import { Router } from 'express'
import { DB2Service } from '../services/db2-service'

export const queryRoutes = Router()

// Executar query SQL
queryRoutes.post('/execute', async (req, res) => {
  try {
    const { sql } = req.body

    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL query é obrigatório'
      })
    }

    const db2Service = DB2Service.getInstance()
    const result = await db2Service.executeQuery(sql)

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Erro ao executar query:', error)
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    })
  }
})

// Testar conexão
queryRoutes.get('/test', async (req, res) => {
  try {
    const db2Service = DB2Service.getInstance()
    const isConnected = await db2Service.testConnection()

    res.json({
      success: true,
      connected: isConnected,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    })
  }
})

// Informações da conexão
queryRoutes.get('/info', (req, res) => {
  try {
    const db2Service = DB2Service.getInstance()
    const connectionInfo = db2Service.getConnectionInfo()

    res.json({
      success: true,
      connection: connectionInfo,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    })
  }
})
