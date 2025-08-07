import { randomUUID } from 'crypto'
import { ChatSession, Message, LLMModel } from '../types'

export class SessionService {
  private static instance: SessionService | null = null
  private sessions: Map<string, ChatSession> = new Map()
  private jsonServerUrl: string

  private constructor() {
    this.jsonServerUrl = process.env.JSON_SERVER_URL || 'http://localhost:3001'
  }

  static getInstance(): SessionService {
    if (!this.instance) {
      this.instance = new SessionService()
    }
    return this.instance
  }

  async loadSessions(): Promise<void> {
    try {
      const response = await fetch(`${this.jsonServerUrl}/sessoes`)
      if (!response.ok) {
        throw new Error('Erro ao buscar sessões do JSON Server')
      }

      const sessionsData = await response.json()

      this.sessions.clear()
      sessionsData.forEach((sessionData: any) => {
        // Converter formato do banco para formato interno
        const session: ChatSession = {
          id: sessionData.id,
          title: sessionData.titulo,
          createdAt: new Date(sessionData.created_at),
          updatedAt: new Date(sessionData.updated_at),
          messages: sessionData.mensagens?.map((msg: any) => ({
            id: msg.id,
            type: msg.tipo,
            content: msg.conteudo,
            timestamp: new Date(msg.timestamp),
            sqlQuery: msg.sql_query,
            queryResult: msg.query_result
          })) || [],
          model: {
            id: sessionData.modelo?.id || 'llama3-70b-8192',
            name: sessionData.modelo?.name || 'Llama 3 70B',
            description: sessionData.modelo?.description || 'Modelo padrão para consultas SQL',
            provider: sessionData.modelo?.provider || 'groq',
            maxTokens: sessionData.modelo?.maxTokens || 8192,
            isDefault: sessionData.modelo?.isDefault || true
          }
        }

        this.sessions.set(session.id, session)
      })

      console.log(`✅ ${sessionsData.length} sessões carregadas do JSON Server`)
    } catch (error) {
      console.error('❌ Erro ao carregar sessões do JSON Server:', error)
    }
  }

  async saveSessions(): Promise<void> {
    // Este método agora é desnecessário pois salvamos diretamente no JSON Server
    // Mantido para compatibilidade, mas não faz nada
    console.log('ℹ️ saveSessions() chamado - usando JSON Server diretamente')
  }

  async createSession(title?: string, model?: LLMModel, userId?: number | string): Promise<ChatSession> {
    const sessionId = this.generateId()
    const now = new Date()
    const session: ChatSession = {
      id: sessionId,
      title: title || `Nova Sessão ${now.toLocaleString('pt-BR')}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
      model: model || this.getDefaultModel()
    }

    // Salvar no JSON Server se userId for fornecido
    if (userId) {
      try {
        const sessionData = {
          id: sessionId,
          titulo: session.title,
          usuario_id: userId,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          modelo: {
            id: session.model.id,
            name: session.model.name,
            description: session.model.description,
            provider: session.model.provider,
            maxTokens: session.model.maxTokens,
            isDefault: session.model.isDefault
          },
          mensagens: [],
          is_favorita: false,
          tags: []
        }

        const response = await fetch(`${this.jsonServerUrl}/sessoes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        })

        if (!response.ok) {
          throw new Error('Erro ao salvar sessão no JSON Server')
        }

        console.log(`📝 Nova sessão criada e salva no banco: ${sessionId}`)
      } catch (error) {
        console.error('❌ Erro ao salvar sessão no banco:', error)
      }
    }

    // Manter na memória para compatibilidade
    this.sessions.set(session.id, session)

    console.log(`📝 Nova sessão criada: ${session.id}`)
    return session
  }

  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) || null
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  updateSession(sessionId: string, updates: Partial<ChatSession>): ChatSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    }

    this.sessions.set(sessionId, updatedSession)
    this.saveSessions() // Salvar automaticamente

    return updatedSession
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId)
    if (deleted) {
      this.saveSessions() // Salvar automaticamente
      console.log(`🗑️ Sessão deletada: ${sessionId}`)
    }
    return deleted
  }

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const newMessage: Message = {
      ...message,
      id: this.generateId(),
      timestamp: new Date()
    }

    // Atualizar na memória
    session.messages.push(newMessage)
    session.updatedAt = new Date()
    this.sessions.set(sessionId, session)

    // Atualizar no JSON Server
    try {
      const messageData = {
        id: newMessage.id,
        tipo: newMessage.type,
        conteudo: newMessage.content,
        timestamp: newMessage.timestamp.toISOString(),
        sql_query: newMessage.sqlQuery,
        query_result: newMessage.queryResult
      }

      // Buscar a sessão atual no banco
      const sessionResponse = await fetch(`${this.jsonServerUrl}/sessoes/${sessionId}`)
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        const updatedMessages = [...(sessionData.mensagens || []), messageData]

        // Atualizar a sessão com a nova mensagem
        await fetch(`${this.jsonServerUrl}/sessoes/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagens: updatedMessages,
            updated_at: new Date().toISOString()
          })
        })

        console.log(`💬 Mensagem adicionada à sessão ${sessionId}`)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem no banco:', error)
    }

    return newMessage
  }

  getSessionMessages(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId)
    return session ? session.messages : []
  }

  updateSessionTitle(sessionId: string, title: string): ChatSession | null {
    return this.updateSession(sessionId, { title })
  }

  getSessionStats(): any {
    const sessions = Array.from(this.sessions.values())
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0)

    return {
      totalSessions: sessions.length,
      totalMessages,
      averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt.getTime())) : null,
      newestSession: sessions.length > 0 ? Math.max(...sessions.map(s => s.createdAt.getTime())) : null
    }
  }

  // Buscar sessões por critérios
  searchSessions(query: string): ChatSession[] {
    const queryLower = query.toLowerCase()
    return Array.from(this.sessions.values())
      .filter(session =>
        session.title.toLowerCase().includes(queryLower) ||
        session.messages.some(message =>
          message.content.toLowerCase().includes(queryLower)
        )
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  // Exportar sessões
  async exportSessions(sessionIds?: string[]): Promise<ChatSession[]> {
    if (sessionIds) {
      return sessionIds
        .map(id => this.sessions.get(id))
        .filter(session => session !== undefined) as ChatSession[]
    }
    return this.getAllSessions()
  }

  // Importar sessões
  async importSessions(sessions: ChatSession[]): Promise<number> {
    let imported = 0

    for (const session of sessions) {
      // Verificar se a sessão já existe
      if (!this.sessions.has(session.id)) {
        // Converter strings de data para objetos Date se necessário
        if (typeof session.createdAt === 'string') {
          session.createdAt = new Date(session.createdAt)
        }
        if (typeof session.updatedAt === 'string') {
          session.updatedAt = new Date(session.updatedAt)
        }

        session.messages.forEach(message => {
          if (typeof message.timestamp === 'string') {
            message.timestamp = new Date(message.timestamp)
          }
        })

        this.sessions.set(session.id, session)
        imported++
      }
    }

    if (imported > 0) {
      await this.saveSessions()
      console.log(`📥 ${imported} sessões importadas`)
    }

    return imported
  }

  private generateId(): string {
    return randomUUID()
  }

  private getDefaultModel(): LLMModel {
    return {
      id: 'llama3-70b-8192',
      name: 'Llama 3 70B',
      description: 'Modelo padrão para consultas SQL',
      provider: 'groq',
      maxTokens: 8192,
      isDefault: true
    }
  }

  // Limpeza automática de sessões antigas
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const sessionsToDelete = Array.from(this.sessions.values())
      .filter(session => session.updatedAt < cutoffDate)

    let deleted = 0
    for (const session of sessionsToDelete) {
      if (this.deleteSession(session.id)) {
        deleted++
      }
    }

    if (deleted > 0) {
      console.log(`🧹 ${deleted} sessões antigas removidas`)
    }

    return deleted
  }
}
