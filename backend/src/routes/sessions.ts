import { Router } from 'express'
import { SessionService } from '../services/session-service'

const router = Router()
const sessionService = SessionService.getInstance()

// Listar todas as sessões
router.get('/', async (req, res) => {
  try {
    const sessions = sessionService.getAllSessions()
    res.json({
      success: true,
      sessions,
      total: sessions.length
    })
  } catch (error) {
    console.error('Erro ao listar sessões:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Criar nova sessão
router.post('/', async (req, res) => {
  try {
    const { title, model } = req.body
    const session = sessionService.createSession(title, model)
    
    res.status(201).json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Erro ao criar sessão:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Obter sessão específica
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const session = sessionService.getSession(sessionId)
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      })
    }

    res.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Erro ao obter sessão:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Atualizar sessão
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const updates = req.body
    
    const session = sessionService.updateSession(sessionId, updates)
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      })
    }

    res.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Deletar sessão
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const deleted = sessionService.deleteSession(sessionId)
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      })
    }

    res.json({
      success: true,
      message: 'Sessão deletada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar sessão:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Obter mensagens de uma sessão
router.get('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params
    const messages = sessionService.getSessionMessages(sessionId)
    
    res.json({
      success: true,
      messages,
      total: messages.length
    })
  } catch (error) {
    console.error('Erro ao obter mensagens:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Buscar sessões
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params
    const sessions = sessionService.searchSessions(query)
    
    res.json({
      success: true,
      sessions,
      total: sessions.length,
      query
    })
  } catch (error) {
    console.error('Erro ao buscar sessões:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Estatísticas das sessões
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = sessionService.getSessionStats()
    
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Exportar sessões
router.post('/export', async (req, res) => {
  try {
    const { sessionIds } = req.body
    const sessions = await sessionService.exportSessions(sessionIds)
    
    res.json({
      success: true,
      sessions,
      total: sessions.length,
      exportedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao exportar sessões:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Importar sessões
router.post('/import', async (req, res) => {
  try {
    const { sessions } = req.body
    
    if (!Array.isArray(sessions)) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido: esperado array de sessões'
      })
    }

    const imported = await sessionService.importSessions(sessions)
    
    res.json({
      success: true,
      imported,
      total: sessions.length,
      message: `${imported} sessões importadas com sucesso`
    })
  } catch (error) {
    console.error('Erro ao importar sessões:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Limpeza de sessões antigas
router.post('/cleanup', async (req, res) => {
  try {
    const { daysOld = 30 } = req.body
    const deleted = await sessionService.cleanupOldSessions(daysOld)
    
    res.json({
      success: true,
      deleted,
      message: `${deleted} sessões antigas removidas`
    })
  } catch (error) {
    console.error('Erro ao limpar sessões:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router
