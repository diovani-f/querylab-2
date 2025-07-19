import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { AuthService } from '../services/auth-service'
import { authMiddleware } from '../middleware/auth-middleware'
import { UserRegistration, UserLogin, AuthRequest } from '../types'

const router = Router()
const authService = AuthService.getInstance()

// Registro de usuário
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { nome, email, senha }: UserRegistration = req.body

    // Validações básicas
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'Nome, email e senha são obrigatórios'
      })
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Senha deve ter pelo menos 6 caracteres'
      })
    }

    // Validação de email básica
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      })
    }

    const result = await authService.register({ nome, email, senha })

    if (result.success) {
      res.status(201).json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    console.error('Erro no registro:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Login de usuário
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha }: UserLogin = req.body

    // Validações básicas
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      })
    }

    const result = await authService.login({ email, senha })

    if (result.success) {
      res.json(result)
    } else {
      res.status(401).json(result)
    }
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Logout de usuário
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(400).json({
        success: false,
        error: 'Token não fornecido'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer '
    const result = await authService.logout(token)

    res.json(result)
  } catch (error) {
    console.error('Erro no logout:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Verificar token e obter dados do usuário
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      })
    }

    res.json({
      success: true,
      user: req.user
    })
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Atualizar perfil do usuário
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      })
    }

    const { nome, preferences } = req.body
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (nome) {
      updates.nome = nome
    }

    if (preferences) {
      updates.preferences = {
        ...req.user.preferences,
        ...preferences
      }
    }

    // Atualizar no JSON Server
    const response = await fetch(`http://localhost:3001/usuarios/${req.user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Erro ao atualizar perfil')
    }

    const updatedUser = await response.json()
    const { senha, ...userWithoutPassword } = updatedUser

    res.json({
      success: true,
      user: userWithoutPassword,
      message: 'Perfil atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Alterar senha
router.put('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      })
    }

    const { senhaAtual, novaSenha } = req.body

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({
        success: false,
        error: 'Senha atual e nova senha são obrigatórias'
      })
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Nova senha deve ter pelo menos 6 caracteres'
      })
    }

    // Buscar usuário completo para verificar senha atual
    const userResponse = await fetch(`http://localhost:3001/usuarios/${req.user.id}`)
    if (!userResponse.ok) {
      throw new Error('Usuário não encontrado')
    }

    const fullUser = await userResponse.json()

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(senhaAtual, fullUser.senha)

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Senha atual incorreta'
      })
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(novaSenha, 10)

    // Atualizar senha no JSON Server
    const updateResponse = await fetch(`http://localhost:3001/usuarios/${req.user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        senha: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
    })

    if (!updateResponse.ok) {
      throw new Error('Erro ao atualizar senha')
    }

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao alterar senha:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router
