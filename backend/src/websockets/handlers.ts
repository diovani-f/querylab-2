import { Server, Socket } from 'socket.io'
import { WebSocketEvents, ChatRequest } from '../types'
import { ChatService } from '../services/chat-service'

export function setupWebSocketHandlers(io: Server) {
  const chatService = ChatService.getInstance()

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`)

    // Entrar em uma sessão
    socket.on('join-session', (sessionId: string) => {
      socket.join(sessionId)
      socket.emit('session-joined', sessionId)
      console.log(`📝 Cliente ${socket.id} entrou na sessão: ${sessionId}`)
    })

    // Processar mensagem de chat
    socket.on('send-message', async (data: ChatRequest & { userId?: number }) => {
      try {
        console.log(`📨 Mensagem recebida via WebSocket:`, data)
        const { sessionId, message, model, userId } = data

        // Notificar que a mensagem está sendo processada
        socket.to(sessionId).emit('message-processing', 'Processando sua consulta...')

        // Processar mensagem usando o ChatService
        const result = await chatService.processMessage({
          sessionId,
          message,
          model,
          userId
        })

        if (!result.success) {
          socket.emit('error', result.error)
          return
        }

        // Usar o ID da sessão (pode ter sido criada uma nova)
        const actualSessionId = result.session?.id || sessionId

        // Enviar mensagem do usuário para todos na sessão
        if (result.userMessage) {
          io.to(actualSessionId).emit('message-received', result.userMessage)
        }

        // Enviar mensagem de resposta para todos na sessão
        if (result.assistantMessage) {
          io.to(actualSessionId).emit('message-received', result.assistantMessage)
        }

      } catch (error) {
        console.error('Erro ao processar mensagem via WebSocket:', error)
        socket.emit('error', 'Erro ao processar mensagem')
      }
    })

    // Sair de uma sessão
    socket.on('disconnect-session', (sessionId: string) => {
      socket.leave(sessionId)
      console.log(`📤 Cliente ${socket.id} saiu da sessão: ${sessionId}`)
    })

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`)
    })
  })
}
