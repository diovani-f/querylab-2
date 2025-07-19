import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/auth-service'
import { AuthRequest } from '../types'

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token de acesso requerido'
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer '
    
    const authService = AuthService.getInstance()
    const decoded = await authService.verifyToken(token)
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      })
      return
    }

    // Buscar dados completos do usuário
    const user = await authService.getUserById(decoded.userId)
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      })
      return
    }

    // Adicionar usuário ao request
    req.user = user
    next()
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Usuário não autenticado'
    })
    return
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Acesso negado: privilégios de administrador requeridos'
    })
    return
  }

  next()
}

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const authService = AuthService.getInstance()
      const decoded = await authService.verifyToken(token)
      
      if (decoded) {
        const user = await authService.getUserById(decoded.userId)
        if (user) {
          req.user = user
        }
      }
    }
    
    next()
  } catch (error) {
    console.error('Erro no middleware de autenticação opcional:', error)
    next() // Continua mesmo com erro, pois é opcional
  }
}
