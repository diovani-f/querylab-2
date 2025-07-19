import { Router } from 'express'
import { authMiddleware } from '../middleware/auth-middleware'
import { AuthRequest } from '../types'

const router = Router()
const JSON_SERVER_URL = process.env.JSON_SERVER_URL || 'http://localhost:3001'

// Buscar favoritos do usuário
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    
    // Verificar se o usuário pode acessar esses favoritos
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/favoritos?usuario_id=${userId}&_sort=created_at&_order=desc`)
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

// Adicionar aos favoritos
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipo, referencia_id, titulo, descricao, categoria, tags } = req.body
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      })
    }

    // Verificar se já existe nos favoritos
    const existingResponse = await fetch(`${JSON_SERVER_URL}/favoritos?usuario_id=${req.user.id}&tipo=${tipo}&referencia_id=${referencia_id}`)
    if (existingResponse.ok) {
      const existing = await existingResponse.json()
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Item já está nos favoritos'
        })
      }
    }

    const favoriteItem = {
      usuario_id: req.user.id,
      tipo,
      referencia_id,
      titulo,
      descricao,
      created_at: new Date().toISOString(),
      categoria: categoria || 'geral',
      tags: tags || []
    }

    const response = await fetch(`${JSON_SERVER_URL}/favoritos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(favoriteItem)
    })

    if (!response.ok) {
      throw new Error('Erro ao adicionar aos favoritos')
    }

    const savedItem = await response.json()
    res.status(201).json({
      success: true,
      favorite: savedItem
    })
  } catch (error) {
    console.error('Erro ao adicionar aos favoritos:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Remover dos favoritos
router.delete('/:favoriteId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { favoriteId } = req.params
    
    // Buscar o item favorito
    const getResponse = await fetch(`${JSON_SERVER_URL}/favoritos/${favoriteId}`)
    if (!getResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'Favorito não encontrado'
      })
    }

    const favoriteItem = await getResponse.json()
    
    // Verificar se o usuário pode deletar este item
    if (req.user?.id !== favoriteItem.usuario_id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    // Deletar o item
    const deleteResponse = await fetch(`${JSON_SERVER_URL}/favoritos/${favoriteId}`, {
      method: 'DELETE'
    })

    if (!deleteResponse.ok) {
      throw new Error('Erro ao remover dos favoritos')
    }

    res.json({
      success: true,
      message: 'Item removido dos favoritos'
    })
  } catch (error) {
    console.error('Erro ao remover dos favoritos:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Atualizar favorito
router.put('/:favoriteId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { favoriteId } = req.params
    const { titulo, descricao, categoria, tags } = req.body
    
    // Buscar o item favorito
    const getResponse = await fetch(`${JSON_SERVER_URL}/favoritos/${favoriteId}`)
    if (!getResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'Favorito não encontrado'
      })
    }

    const favoriteItem = await getResponse.json()
    
    // Verificar se o usuário pode atualizar este item
    if (req.user?.id !== favoriteItem.usuario_id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const updates = {
      titulo: titulo || favoriteItem.titulo,
      descricao: descricao || favoriteItem.descricao,
      categoria: categoria || favoriteItem.categoria,
      tags: tags || favoriteItem.tags
    }

    // Atualizar o item
    const updateResponse = await fetch(`${JSON_SERVER_URL}/favoritos/${favoriteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!updateResponse.ok) {
      throw new Error('Erro ao atualizar favorito')
    }

    const updatedItem = await updateResponse.json()
    res.json({
      success: true,
      favorite: updatedItem
    })
  } catch (error) {
    console.error('Erro ao atualizar favorito:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Buscar favoritos por categoria
router.get('/user/:userId/category/:category', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, category } = req.params
    
    // Verificar se o usuário pode acessar esses favoritos
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/favoritos?usuario_id=${userId}&categoria=${category}&_sort=created_at&_order=desc`)
    if (!response.ok) {
      throw new Error('Erro ao buscar favoritos por categoria')
    }

    const favorites = await response.json()
    res.json({
      success: true,
      favorites,
      total: favorites.length,
      category
    })
  } catch (error) {
    console.error('Erro ao buscar favoritos por categoria:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Buscar favoritos
router.get('/search/:userId/:query', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, query } = req.params
    
    // Verificar se o usuário pode acessar esses favoritos
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      })
    }

    const response = await fetch(`${JSON_SERVER_URL}/favoritos?usuario_id=${userId}&q=${encodeURIComponent(query)}`)
    if (!response.ok) {
      throw new Error('Erro ao buscar favoritos')
    }

    const favorites = await response.json()
    res.json({
      success: true,
      favorites,
      total: favorites.length,
      query
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
