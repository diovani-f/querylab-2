import bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { User, UserRegistration, UserLogin, AuthResponse, JWTPayload } from '../types'

export class AuthService {
  private static instance: AuthService
  private jsonServerUrl: string
  private jwtSecret: string
  private jwtExpiresIn: string

  private constructor() {
    this.jsonServerUrl = process.env.JSON_SERVER_URL || 'http://localhost:3001'
    this.jwtSecret = process.env.JWT_SECRET || 'querylab-secret-key-2024'
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d'
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async register(userData: UserRegistration): Promise<AuthResponse> {
    try {
      // Verificar se o email já existe
      const existingUser = await this.findUserByEmail(userData.email)
      if (existingUser) {
        return {
          success: false,
          error: 'Email já está em uso'
        }
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.senha, 10)

      // Criar novo usuário
      const newUser: Omit<User, 'id'> = {
        nome: userData.nome,
        email: userData.email,
        senha: hashedPassword,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        preferences: {
          theme: 'dark',
          language: 'pt-BR',
          default_model: 'llama3-70b-8192'
        }
      }

      // Salvar no JSON Server
      const response = await fetch(`${this.jsonServerUrl}/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      })

      if (!response.ok) {
        throw new Error('Erro ao criar usuário')
      }

      const createdUser: User = await response.json()

      // Gerar token JWT
      const token = this.generateToken({
        userId: createdUser.id,
        email: createdUser.email,
        role: createdUser.role
      })

      // Salvar token no JSON Server
      await this.saveToken(createdUser.id, token)

      // Remover senha da resposta
      const { senha, ...userWithoutPassword } = createdUser

      return {
        success: true,
        user: userWithoutPassword,
        token,
        message: 'Usuário criado com sucesso'
      }
    } catch (error) {
      console.error('Erro no registro:', error)
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  async login(credentials: UserLogin): Promise<AuthResponse> {
    try {
      // Buscar usuário por email
      const user = await this.findUserByEmail(credentials.email)
      if (!user) {
        return {
          success: false,
          error: 'Email ou senha inválidos'
        }
      }

      // Verificar se o usuário está ativo
      if (!user.is_active) {
        return {
          success: false,
          error: 'Conta desativada'
        }
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(credentials.senha, user.senha)
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Email ou senha inválidos'
        }
      }

      // Atualizar último login
      await this.updateLastLogin(user.id)

      // Gerar token JWT
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      // Salvar token no JSON Server
      await this.saveToken(user.id, token)

      // Remover senha da resposta
      const { senha, ...userWithoutPassword } = user

      return {
        success: true,
        user: userWithoutPassword,
        token,
        message: 'Login realizado com sucesso'
      }
    } catch (error) {
      console.error('Erro no login:', error)
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  async logout(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Revogar token
      await this.revokeToken(token)

      return {
        success: true,
        message: 'Logout realizado com sucesso'
      }
    } catch (error) {
      console.error('Erro no logout:', error)
      return {
        success: false,
        message: 'Erro ao fazer logout'
      }
    }
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      // Verificar se o token não foi revogado
      const isRevoked = await this.isTokenRevoked(token)
      if (isRevoked) {
        return null
      }

      // Verificar e decodificar token
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload
      return decoded
    } catch (error) {
      console.error('Erro ao verificar token:', error)
      return null
    }
  }

  async getUserById(userId: number): Promise<Omit<User, 'senha'> | null> {
    try {
      const response = await fetch(`${this.jsonServerUrl}/usuarios/${userId}`)
      if (!response.ok) {
        return null
      }

      const user: User = await response.json()
      const { senha, ...userWithoutPassword } = user
      return userWithoutPassword
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      return null
    }
  }

  private generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    } as any)
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.jsonServerUrl}/usuarios?email=${email}`)
      if (!response.ok) {
        return null
      }

      const users: User[] = await response.json()
      return users.length > 0 ? users[0] : null
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error)
      return null
    }
  }

  private async updateLastLogin(userId: number): Promise<void> {
    try {
      await fetch(`${this.jsonServerUrl}/usuarios/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Erro ao atualizar último login:', error)
    }
  }

  private async saveToken(userId: number, token: string): Promise<void> {
    try {
      const tokenHash = await bcrypt.hash(token, 10)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 dias

      await fetch(`${this.jsonServerUrl}/tokens_jwt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuario_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          is_revoked: false,
          device_info: 'Unknown Device'
        })
      })
    } catch (error) {
      console.error('Erro ao salvar token:', error)
    }
  }

  private async revokeToken(token: string): Promise<void> {
    try {
      // Buscar tokens ativos
      const response = await fetch(`${this.jsonServerUrl}/tokens_jwt?is_revoked=false`)
      if (!response.ok) return

      const tokens = await response.json()

      // Encontrar o token correspondente
      for (const tokenRecord of tokens) {
        const isMatch = await bcrypt.compare(token, tokenRecord.token_hash)
        if (isMatch) {
          // Revogar token
          await fetch(`${this.jsonServerUrl}/tokens_jwt/${tokenRecord.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              is_revoked: true
            })
          })
          break
        }
      }
    } catch (error) {
      console.error('Erro ao revogar token:', error)
    }
  }

  private async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.jsonServerUrl}/tokens_jwt?is_revoked=false`)
      if (!response.ok) return true

      const tokens = await response.json()

      for (const tokenRecord of tokens) {
        const isMatch = await bcrypt.compare(token, tokenRecord.token_hash)
        if (isMatch) {
          // Verificar se não expirou
          const expiresAt = new Date(tokenRecord.expires_at)
          return expiresAt < new Date()
        }
      }

      return true // Token não encontrado = revogado
    } catch (error) {
      console.error('Erro ao verificar se token foi revogado:', error)
      return true
    }
  }
}
