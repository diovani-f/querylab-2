import { Mensagem, PrismaClient, Sessao } from '@prisma/client'

export class SessionService {
  private static instance: SessionService | null = null
  private prisma: PrismaClient

  private constructor() {
    this.prisma = new PrismaClient()
  }

  static getInstance(): SessionService {
    if (!this.instance) {
      this.instance = new SessionService()
    }
    return this.instance
  }

   /**
   * Cria uma nova sessão no banco de dados via Prisma
   */
  async createSession(usuarioId: string, titulo: string, modeloId: string) {
    return this.prisma.sessao.create({
      data: {
        usuarioId,
        titulo,
        modeloId,
        isFavorita: false,
        tags: []
      },
      include: {
        mensagens: true,
        modelo: true
      }
    })
  }

  /**
   * Busca uma sessão no banco de dados via Prisma
   */
  async getSession(sessaoId: string) {
    return this.prisma.sessao.findUnique({
      where: { id: sessaoId },
      include: { mensagens: true, modelo: true }
    })
  }

  async getAllSessions(usuarioId: string) {
    return this.prisma.sessao.findMany({
      where: { usuarioId },
      orderBy: {
        updatedAt: 'desc'
      }
    })
  }

  async updateSession(sessaoId: string, updates: Partial<Sessao>) {
    try {
      const updatedSession = await this.prisma.sessao.update({
        where: { id: sessaoId },
        data: {
          titulo: updates.titulo,
          isFavorita: updates.isFavorita,
          tags: updates.tags
        }
      })
      return updatedSession
    } catch (error) {
      console.error('❌ Erro ao atualizar sessão no banco:', error)
      return null
    }
  }

  async deleteSession(sessaoId: string): Promise<boolean> {
    try {
      await this.prisma.mensagem.deleteMany({
        where: { sessaoId }
      })

      const result = await this.prisma.sessao.delete({
        where: { id: sessaoId }
      })
      return !!result
    } catch (error) {
      console.error(`❌ Erro ao deletar sessão ${sessaoId}:`, error)
      throw error;
    }
  }

  async addMessage(sessaoId: string, message: Omit<Mensagem, 'id' | 'timestamp' | 'sessaoId'>) {
    try {
      const newMessage = await this.prisma.mensagem.create({
        data: {
          sessaoId: sessaoId,
          tipo: message.tipo,
          conteudo: message.conteudo,
          sqlQuery: message.sqlQuery,
          queryResult: message.queryResult || undefined,
        }
      })
      return newMessage
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem no banco:', error)
      return null
    }
  }

  async updateSessionTitle(sessaoId: string, titulo: string): Promise<Sessao | null> {
    return this.updateSession(sessaoId, { titulo })
  }

  async getSessionStats(usuarioId: string): Promise<any> {
    const totalSessions = await this.prisma.sessao.count({ where: { usuarioId } })
    const totalMessages = await this.prisma.mensagem.count({
      where: { sessao: { usuarioId } }
    })

    return {
      totalSessions,
      totalMessages,
    }
  }

  async searchSessions(usuarioId: string, query: string): Promise<Sessao[]> {
    const queryLower = query.toLowerCase()
    return this.prisma.sessao.findMany({
      where: {
        usuarioId,
        OR: [
          { titulo: { contains: queryLower, mode: 'insensitive' } },
          {
            mensagens: {
              some: {
                conteudo: { contains: queryLower, mode: 'insensitive' }
              }
            }
          }
        ]
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
  }
}
