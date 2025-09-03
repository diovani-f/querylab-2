import { io, Socket } from 'socket.io-client'
import { Message, ChatRequest } from '@/types'

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:5000'

class WebSocketService {
  private socket: Socket | null = null
  private currentSessionId: string | null = null

  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(WEBSOCKET_URL, {
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('🔌 Conectado ao WebSocket')
    })

    this.socket.on('disconnect', () => {
      console.log('🔌 Desconectado do WebSocket')
    })

    this.socket.on('error', (error: string) => {
      console.error('❌ Erro no WebSocket:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.currentSessionId = null
    }
  }

  joinSession(sessionId: string) {
    if (!this.socket) {
      this.connect()
    }

    this.currentSessionId = sessionId
    this.socket?.emit('join-session', sessionId)
  }

  leaveSession() {
    if (this.socket && this.currentSessionId) {
      this.socket.emit('disconnect-session', this.currentSessionId)
      this.currentSessionId = null
    }
  }

  sendMessage(request: ChatRequest) {
    if (!this.socket) {
      throw new Error('WebSocket não conectado')
    }

    console.log('📤 Enviando mensagem via WebSocket:', request)
    this.socket.emit('send-message', request)
  }

  onMessageReceived(callback: (message: Message) => void) {
    this.socket?.on('message-received', callback)
  }

  onMessageProcessing(callback: (status: string) => void) {
    this.socket?.on('message-processing', callback)
  }

  onMessageUpdated(callback: (message: Message) => void) {
    this.socket?.on('message-updated', callback)
  }

  onQueryExecuting(callback: (status: string) => void) {
    this.socket?.on('query-executing', callback)
  }

  onQueryError(callback: (error: string) => void) {
    this.socket?.on('query-error', callback)
  }

  executeQuery(data: { messageId: string, sessionId: string }) {
    if (!this.socket) {
      throw new Error('WebSocket não conectado')
    }
    this.socket.emit('execute-query', data)
  }

  onSessionJoined(callback: (sessionId: string) => void) {
    this.socket?.on('session-joined', callback)
  }

  onError(callback: (error: string) => void) {
    this.socket?.on('error', callback)
  }

  onEvaluationUpdated(callback: (data: { messageId: string, evaluation: any }) => void) {
    this.socket?.on('evaluation-updated', callback)
  }

  // Remove listeners
  removeAllListeners() {
    this.socket?.removeAllListeners()
  }

  removeListener(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback)
    } else {
      this.socket?.removeAllListeners(event)
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const websocketService = new WebSocketService()
