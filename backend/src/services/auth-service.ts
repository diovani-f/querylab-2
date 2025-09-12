import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User, UserRegistration, UserLogin, AuthResponse, JWTPayload } from '../types';
import prisma from '../prisma';

export class AuthService {
  private static instance: AuthService;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'querylab-secret-key-2024';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(userData: UserRegistration): Promise<AuthResponse> {
    try {
      // Verificar se o email já existe
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email já está em uso'
        };
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.senha, 10);

      // Criar novo usuário e salvar no banco de dados com Prisma
      const newUser = await prisma.usuario.create({
        data: {
          nome: userData.nome,
          email: userData.email,
          senha: hashedPassword,
          role: 'user',
          isActive: true,
          preferences: {
            theme: 'dark',
            language: 'pt-BR',
            default_model: 'llama-3.3-70b-versatile'
          } as any, // Adicione 'as any' para o tipo Json, se necessário
        },
      });

      // Gerar token JWT
      const token = this.generateToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      // Salvar token no banco de dados
      await this.saveToken(newUser.id, token);

      // Remover senha da resposta
      const { senha, ...userWithoutPassword } = newUser;

      return {
        success: true,
        user: userWithoutPassword,
        token,
        message: 'Usuário criado com sucesso'
      };
    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  async login(credentials: UserLogin): Promise<AuthResponse> {
    try {
      // Buscar usuário por email
      const user = await this.findUserByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          error: 'Email ou senha inválidos'
        };
      }

      // Verificar se o usuário está ativo
      if (!user.isActive) {
        return {
          success: false,
          error: 'Conta desativada'
        };
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(credentials.senha, user.senha);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Email ou senha inválidos'
        };
      }

      // Atualizar último login
      await this.updateLastLogin(user.id);

      // Gerar token JWT
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Salvar token no banco de dados
      await this.saveToken(user.id, token);

      // Remover senha da resposta
      const { senha, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        token,
        message: 'Login realizado com sucesso'
      };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  async logout(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Revogar token
      await this.revokeToken(token);
      return {
        success: true,
        message: 'Logout realizado com sucesso'
      };
    } catch (error) {
      console.error('Erro no logout:', error);
      return {
        success: false,
        message: 'Erro ao fazer logout'
      };
    }
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      // Verificar se o token não foi revogado
      const isRevoked = await this.isTokenRevoked(token);

      if (isRevoked) {
        return null;
      }

      // Verificar e decodificar token
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<Omit<User, 'senha'> | null> {
    try {
      const user = await prisma.usuario.findUnique({
        where: { id: userId },
      });
      if (!user) {
        return null;
      }

      const { senha, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  private generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as any);
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.usuario.findUnique({
        where: { email },
      });
      return user || null;
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      return null;
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await prisma.usuario.update({
        where: { id: userId },
        data: {
          lastLogin: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar último login:', error);
    }
  }

  private async saveToken(userId: string, token: string): Promise<void> {
    try {
      // Primeiro, revogar todos os tokens antigos deste usuário
      await prisma.token.updateMany({
        where: {
          usuarioId: userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      const tokenHash = await bcrypt.hash(token, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.token.create({
        data: {
          usuarioId: userId,
          tokenHash: tokenHash,
          expiresAt: expiresAt,
          isRevoked: false,
          deviceInfo: 'Unknown Device',
        },
      });
    } catch (error) {
      console.error('Erro ao salvar token:', error);
    }
  }

  private async revokeToken(token: string): Promise<void> {
    try {
      const tokenRecord = await prisma.token.findFirst({
        where: {
          isRevoked: false,
          usuario: {
            tokens: {
              some: {
                tokenHash: {
                  equals: await bcrypt.hash(token, 10), // A busca por hash não é ideal, vamos melhorar isso
                },
              },
            },
          },
        },
      });

      if (tokenRecord) {
        await prisma.token.update({
          where: { id: tokenRecord.id },
          data: { isRevoked: true },
        });
      }
    } catch (error) {
      console.error('Erro ao revogar token:', error);
    }
  }

  private async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const tokens = await prisma.token.findMany({
        where: {
          isRevoked: false,
        },
      });

      for (const tokenRecord of tokens) {
        const isMatch = await bcrypt.compare(token, tokenRecord.tokenHash);

        if (isMatch) {
          const expiresAt = new Date(tokenRecord.expiresAt);
          const isExpired = expiresAt < new Date();
          return isExpired;
        }
      }

      return true; // Token não encontrado ou já revogado
    } catch (error) {
      console.error('Erro ao verificar se token foi revogado:', error);
      return true;
    }
  }
}
