import { Router } from 'express'
import { SessionService } from '../services/session-service'
import { authMiddleware } from '../middleware/auth-middleware'
import { AuthRequest, ChatSession, QueryResult } from '../types'
import { PrismaClient } from '@prisma/client'
import { LLMService } from '../services/llm-service'

const router = Router()
const sessionService = SessionService.getInstance()
const llmService = LLMService.getInstance()
const prisma = new PrismaClient()

// Listar sessões do usuário autenticado
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    const authenticatedUserIdStr = req.user?.id?.toString()

    if (authenticatedUserIdStr !== userId && req.user?.role !== 'admin') {
      console.log('🔒 Acesso negado:', {
        requestedUserId: userId,
        authenticatedUserId: authenticatedUserIdStr,
        userRole: req.user?.role
      })
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const sessionsData = await prisma.sessao.findMany({
      where: { usuarioId: userId },
      include: {
        mensagens: true,
        modelo: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    const sessions = sessionsData.map(session => ({
      ...session,
      title: session.titulo,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.mensagens.map(msg => ({
        id: msg.id,
        type: msg.tipo,
        content: msg.conteudo,
        timestamp: msg.timestamp,
        sqlQuery: msg.sqlQuery as QueryResult,
        queryResult: msg.queryResult
      }))
    })) as ChatSession[]

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
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: privilégios de administrador requeridos'
      })
    }

    const sessions = await prisma.sessao.findMany({
      include: {
        mensagens: true,
        modelo: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Mapeamento para ChatSession
    const mappedSessions = sessions.map(session => ({
        ...session,
        title: session.titulo,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.mensagens.map(msg => ({
            id: msg.id,
            type: msg.tipo,
            content: msg.conteudo,
            timestamp: msg.timestamp,
            sqlQuery: msg.sqlQuery as QueryResult,
            queryResult: msg.queryResult
        }))
    })) as ChatSession[];


    res.json({
      success: true,
      sessions: mappedSessions,
      total: mappedSessions.length
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

    const session = await sessionService.createSession(req.user.id, title, model)

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
    const sessionData = await prisma.sessao.findUnique({
      where: { id: sessionId },
      include: {
        mensagens: true,
        modelo: true
      }
    })

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      })
    }

    // Mapeamento para ChatSession
    const session = {
        ...sessionData,
        title: sessionData.titulo,
        messages: sessionData.mensagens.map(msg => ({
            id: msg.id,
            type: msg.tipo,
            content: msg.conteudo,
            timestamp: msg.timestamp,
            sqlQuery: msg.sqlQuery,
            queryResult: msg.queryResult
        }))
    } as ChatSession;

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

    // Mapeamento para os campos do Prisma
    const dataUpdates = {
      titulo: updates.title,
      // ... outros campos que podem ser atualizados
    };

    const sessionData = await prisma.sessao.update({
      where: { id: sessionId },
      data: dataUpdates,
      include: {
        mensagens: true,
        modelo: true
      }
    })

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      })
    }

    // Mapeamento de volta para ChatSession
    const session = {
      ...sessionData,
      title: sessionData.titulo,
      messages: sessionData.mensagens.map(msg => ({
        id: msg.id,
        type: msg.tipo,
        content: msg.conteudo,
        timestamp: msg.timestamp,
        sqlQuery: msg.sqlQuery,
        queryResult: msg.queryResult
      }))
    } as ChatSession;

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
router.delete('/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      })
    }

    const sessionData = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: { usuarioId: true }
    })

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      })
    }

    if (sessionData.usuarioId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: você só pode deletar suas próprias sessões'
      })
    }

    await prisma.sessao.delete({
      where: { id: sessionId }
    })

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
    const messages = await prisma.mensagem.findMany({
      where: { sessaoId: sessionId },
      orderBy: { timestamp: 'asc' }
    })

    // Mapeamento para o tipo 'Message'
    const mappedMessages = messages.map(msg => ({
        id: msg.id,
        type: msg.tipo,
        content: msg.conteudo,
        timestamp: msg.timestamp,
        sqlQuery: msg.sqlQuery,
        queryResult: msg.queryResult
    }));

    res.json({
      success: true,
      messages: mappedMessages,
      total: mappedMessages.length
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
    const sessions = await prisma.sessao.findMany({
      where: {
        OR: [
          { titulo: { contains: query, mode: 'insensitive' } },
          { mensagens: { some: { conteudo: { contains: query, mode: 'insensitive' } } } }
        ]
      },
      include: {
        mensagens: true,
        modelo: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Mapeamento para ChatSession
    const mappedSessions = sessions.map(session => ({
        ...session,
        title: session.titulo,
        messages: session.mensagens.map(msg => ({
            id: msg.id,
            type: msg.tipo,
            content: msg.conteudo,
            timestamp: msg.timestamp,
            sqlQuery: msg.sqlQuery as QueryResult,
            queryResult: msg.queryResult
        }))
    })) as ChatSession[];

    res.json({
      success: true,
      sessions: mappedSessions,
      total: mappedSessions.length,
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

// Rotas para histórico de consultas
router.get('/history/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params

    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const history = await prisma.historico.findMany({
      where: { usuarioId: userId }
    })

    const mappedHistory = history.map(h => ({
        ...h,
        id: h.id.toString(), // Converter o ID para string
        isFavorite: h.isFavorito
    }));

    res.json({
      success: true,
      history: mappedHistory,
      total: mappedHistory.length
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
    const { userId } = req.params;

    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    const favoriteSessions = await prisma.sessao.findMany({
      where: {
        usuarioId: userId,
        isFavorita: true
      },
      include: {
        mensagens: true,
        modelo: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const mappedSessions = favoriteSessions.map(session => ({
      id: session.id,
      title: session.titulo,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.mensagens.map(msg => ({
        id: msg.id,
        type: msg.tipo,
        content: msg.conteudo,
        timestamp: msg.timestamp,
        sqlQuery: msg.sqlQuery,
        queryResult: msg.queryResult
      })),
      modelo: session.modelo,
      isFavorite: session.isFavorita
    }));

    res.json({
      success: true,
      favorites: mappedSessions,
      total: mappedSessions.length
    });
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router
