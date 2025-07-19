import { Router } from 'express'
import { SessionService } from '../services/session-service'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth-middleware'
import { AuthRequest } from '../types'

const router = Router()
const sessionService = SessionService.getInstance()
const JSON_SERVER_URL = process.env.JSON_SERVER_URL || 'http://localhost:3001'

// Listar sessões do usuário autenticado
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params

    // Verificar se o usuário pode acessar essas sessões
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/sessoes?usuario_id=${userId}&_sort=updated_at&_order=desc`)
    if (!response.ok) {
      throw new Error('Erro ao buscar sessões')
    }

    const sessionsData = await response.json()

    // Converter formato do banco para formato esperado pelo frontend
    const sessions = sessionsData.map((session: any) => ({
      id: session.id,
      title: session.titulo,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      messages: session.mensagens?.map((msg: any) => ({
        id: msg.id,
        type: msg.tipo,
        content: msg.conteudo,
        timestamp: msg.timestamp,
        sqlQuery: msg.sql_query,
        queryResult: msg.query_result
      })) || [],
      model: {
        id: session.modelo?.id || 'llama3-70b-8192',
        name: session.modelo?.name || 'Llama 3 70B',
        description: session.modelo?.description || 'Modelo padrão para consultas SQL',
        provider: session.modelo?.provider || 'groq',
        maxTokens: session.modelo?.maxTokens || 8192,
        isDefault: session.modelo?.isDefault || true
      }
    }))

    res.json({
      success: true,
      sessions,
      total: sessions.length
    })
  } catch (error) {
    console.error('Erro ao listar sessões do usuário:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Listar todas as sessões (admin)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Apenas admins podem ver todas as sessões
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: privilégios de administrador requeridos'
      })
    }

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
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, model } = req.body

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      })
    }

    // Criar sessão no banco de dados
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    const sessionData = {
      id: sessionId,
      titulo: title || `Nova Sessão ${new Date().toLocaleString('pt-BR')}`,
      usuario_id: req.user.id,
      created_at: now,
      updated_at: now,
      modelo: {
        id: model || 'llama3-70b-8192',
        name: 'Llama 3 70B',
        description: 'Modelo padrão para consultas SQL',
        provider: 'groq',
        maxTokens: 8192,
        isDefault: true
      },
      mensagens: [],
      is_favorita: false,
      tags: []
    }

    const response = await fetch(`${JSON_SERVER_URL}/sessoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    })

    if (!response.ok) {
      throw new Error('Erro ao criar sessão no banco')
    }

    const session = {
      id: sessionId,
      title: sessionData.titulo,
      createdAt: now,
      updatedAt: now,
      messages: [],
      model: {
        id: model || 'llama3-70b-8192',
        name: 'Llama 3 70B',
        description: 'Modelo padrão para consultas SQL',
        provider: 'groq',
        maxTokens: 8192,
        isDefault: true
      }
    }

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

// Rotas para histórico de consultas
router.get('/history/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params

    // Verificar se o usuário pode acessar esse histórico
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/historico?usuario_id=${userId}`)
    if (!response.ok) {
      throw new Error('Erro ao buscar histórico')
    }

    const history = await response.json()
    res.json({
      success: true,
      history,
      total: history.length
    })
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Rotas para favoritos
router.get('/favorites/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params

    // Verificar se o usuário pode acessar esses favoritos
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/favoritos?usuario_id=${userId}`)
    if (!response.ok) {
      throw new Error('Erro ao buscar favoritos')
    }

    const favorites = await response.json()
    res.json({
      success: true,
      favorites,
      total: favorites.length
    })
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router
