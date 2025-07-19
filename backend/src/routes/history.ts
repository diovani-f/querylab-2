import { Router } from 'express'
import { authMiddleware } from '../middleware/auth-middleware'
import { AuthRequest } from '../types'

const router = Router()
const JSON_SERVER_URL = process.env.JSON_SERVER_URL || 'http://localhost:3001'

// Buscar histórico do usuário
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    
    // Verificar se o usuário pode acessar esse histórico
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/historico?usuario_id=${userId}&_sort=timestamp&_order=desc`)
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

// Adicionar item ao histórico
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessao_id, consulta, sql_gerado, resultado, modelo_usado, tags } = req.body
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      })
    }

    const historyItem = {
      usuario_id: req.user.id,
      sessao_id,
      consulta,
      sql_gerado,
      resultado,
      modelo_usado,
      timestamp: new Date().toISOString(),
      is_favorito: false,
      tags: tags || []
    }

    const response = await fetch(`${JSON_SERVER_URL}/historico`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(historyItem)
    })

    if (!response.ok) {
      throw new Error('Erro ao salvar no histórico')
    }

    const savedItem = await response.json()
    res.status(201).json({
      success: true,
      history: savedItem
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
    const { is_favorito } = req.body
    
    // Buscar o item do histórico
    const getResponse = await fetch(`${JSON_SERVER_URL}/historico/${historyId}`)
    if (!getResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'Item do histórico não encontrado'
      })
    }

    const historyItem = await getResponse.json()
    
    // Verificar se o usuário pode modificar este item
    if (req.user?.id !== historyItem.usuario_id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    // Atualizar o status de favorito
    const updateResponse = await fetch(`${JSON_SERVER_URL}/historico/${historyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_favorito })
    })

    if (!updateResponse.ok) {
      throw new Error('Erro ao atualizar favorito')
    }

    const updatedItem = await updateResponse.json()
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
    
    // Buscar o item do histórico
    const getResponse = await fetch(`${JSON_SERVER_URL}/historico/${historyId}`)
    if (!getResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'Item do histórico não encontrado'
      })
    }

    const historyItem = await getResponse.json()
    
    // Verificar se o usuário pode deletar este item
    if (req.user?.id !== historyItem.usuario_id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    // Deletar o item
    const deleteResponse = await fetch(`${JSON_SERVER_URL}/historico/${historyId}`, {
      method: 'DELETE'
    })

    if (!deleteResponse.ok) {
      throw new Error('Erro ao deletar item do histórico')
    }

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
    
    // Verificar se o usuário pode acessar esse histórico
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/historico?usuario_id=${userId}&q=${encodeURIComponent(query)}`)
    if (!response.ok) {
      throw new Error('Erro ao buscar no histórico')
    }

    const history = await response.json()
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
