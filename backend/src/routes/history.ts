import { Router } from 'express'
import { authMiddleware } from '../middleware/auth-middleware'
import { AuthRequest } from '../types'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Buscar histórico do usuário
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params

    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const history = await prisma.historico.findMany({
      where: { usuarioId: userId },
      orderBy: { timestamp: 'desc' }
    })

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

// Adicionar item ao histórico
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessaoId, consulta, sqlGerado, resultado, modeloUsado, tags } = req.body

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      })
    }

    const historyItem = await prisma.historico.create({
      data: {
        usuarioId: req.user.id,
        sessaoId,
        consulta,
        sqlGerado,
        resultado,
        modeloUsado,
        isFavorito: false,
        tags: tags || []
      }
    })

    res.status(201).json({
      success: true,
      history: historyItem
    })
  } catch (error) {
    console.error('Erro ao adicionar ao histórico:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Marcar/desmarcar como favorito
router.patch('/:historyId/favorite', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { historyId } = req.params
    const { isFavorito } = req.body

    const historyItem = await prisma.historico.findUnique({
      where: { id: parseInt(historyId) }
    })

    if (!historyItem) {
      return res.status(404).json({
        success: false,
        error: 'Item do histórico não encontrado'
      })
    }

    if (req.user?.id !== historyItem.usuarioId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const updatedItem = await prisma.historico.update({
      where: { id: parseInt(historyId) },
      data: { isFavorito }
    })

    res.json({
      success: true,
      history: updatedItem
    })
  } catch (error) {
    console.error('Erro ao atualizar favorito:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Deletar item do histórico
router.delete('/:historyId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { historyId } = req.params

    const historyItem = await prisma.historico.findUnique({
      where: { id: parseInt(historyId) }
    })

    if (!historyItem) {
      return res.status(404).json({
        success: false,
        error: 'Item do histórico não encontrado'
      })
    }

    if (req.user?.id !== historyItem.usuarioId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    await prisma.historico.delete({
      where: { id: parseInt(historyId) }
    })

    res.json({
      success: true,
      message: 'Item removido do histórico'
    })
  } catch (error) {
    console.error('Erro ao deletar do histórico:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Buscar no histórico
router.get('/search/:userId/:query', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, query } = req.params

    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const history = await prisma.historico.findMany({
      where: {
        usuarioId: userId,
        OR: [
          { consulta: { contains: query, mode: 'insensitive' } },
          { sqlGerado: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { timestamp: 'desc' }
    })

    res.json({
      success: true,
      history,
      total: history.length,
      query
    })
  } catch (error) {
    console.error('Erro ao buscar no histórico:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router
