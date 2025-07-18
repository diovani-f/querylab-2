import { ChatSession, Message, LLMModel } from '../types'
import fs from 'fs/promises'
import path from 'path'

export class SessionService {
  private static instance: SessionService | null = null
  private sessions: Map<string, ChatSession> = new Map()
  private sessionsFilePath: string

  private constructor() {
    this.sessionsFilePath = path.join(process.cwd(), 'data', 'sessions.json')
    this.ensureDataDirectory()
  }

  static getInstance(): SessionService {
    if (!this.instance) {
      this.instance = new SessionService()
    }
    return this.instance
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      const dataDir = path.dirname(this.sessionsFilePath)
      await fs.mkdir(dataDir, { recursive: true })
    } catch (error) {
      console.error('Erro ao criar diretório de dados:', error)
    }
  }

  async loadSessions(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionsFilePath, 'utf-8')
      const sessionsArray: ChatSession[] = JSON.parse(data)
      
      this.sessions.clear()
      sessionsArray.forEach(session => {
        // Converter strings de data de volta para objetos Date
        session.createdAt = new Date(session.createdAt)
        session.updatedAt = new Date(session.updatedAt)
        session.messages.forEach(message => {
          message.timestamp = new Date(message.timestamp)
        })
        
        this.sessions.set(session.id, session)
      })
      
      console.log(`✅ ${sessionsArray.length} sessões carregadas`)
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('📁 Arquivo de sessões não encontrado, iniciando com sessões vazias')
      } else {
        console.error('❌ Erro ao carregar sessões:', error)
      }
    }
  }

  async saveSessions(): Promise<void> {
    try {
      const sessionsArray = Array.from(this.sessions.values())
      await fs.writeFile(this.sessionsFilePath, JSON.stringify(sessionsArray, null, 2))
      console.log(`💾 ${sessionsArray.length} sessões salvas`)
    } catch (error) {
      console.error('❌ Erro ao salvar sessões:', error)
    }
  }

  createSession(title?: string, model?: LLMModel): ChatSession {
    const session: ChatSession = {
      id: this.generateId(),
      title: title || `Nova Sessão ${new Date().toLocaleString('pt-BR')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      model: model || this.getDefaultModel()
    }

    this.sessions.set(session.id, session)
    this.saveSessions() // Salvar automaticamente
    
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

  addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Message | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const newMessage: Message = {
      ...message,
      id: this.generateId(),
      timestamp: new Date()
    }

    session.messages.push(newMessage)
    session.updatedAt = new Date()

    this.sessions.set(sessionId, session)
    this.saveSessions() // Salvar automaticamente

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
    return crypto.randomUUID()
  }

  private getDefaultModel(): LLMModel {
    return {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'OpenAI GPT-4 - Mais avançado para consultas complexas',
      provider: 'openai',
      isAvailable: true
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
