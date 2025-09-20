import { Server, Socket } from 'socket.io'
import { WebSocketEvents, ChatRequest } from '../types'
import { ChatService } from '../services/chat-service'

export function setupWebSocketHandlers(io: Server) {
  const chatService = ChatService.getInstance()

  io.on('connection', (socket: Socket) => {
    // Entrar em uma sessão
    socket.on('join-session', (sessionId: string) => {
      socket.join(sessionId)
      socket.emit('session-joined', sessionId)
    })

    // Processar mensagem de chat
    socket.on('send-message', async (data: ChatRequest & { userId?: string, autoExecuteSQL?: boolean }) => {
      try {
        const { sessionId, message, model, userId, autoExecuteSQL } = data

        // Notificar que a mensagem está sendo processada
        socket.to(sessionId).emit('message-processing', 'Processando sua consulta...')

        // Processar mensagem usando o ChatService
        const result = await chatService.processMessage({
          sessionId,
          message,
          model,
          userId,
          autoExecuteSQL: autoExecuteSQL !== undefined ? autoExecuteSQL : true // Default true
        })

        if (!result.success) {
          // console.log("🚀 ~ setupWebSocketHandlers ~ result:", result)
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
          console.log('📤 Enviando mensagem do assistente via WebSocket:', {
            id: result.assistantMessage.id,
            hasExplanation: result.assistantMessage.hasExplanation,
            hasSqlQuery: !!result.assistantMessage?.sqlQuery,
            hasQueryResult: !!result.assistantMessage.queryResult
          })
          io.to(actualSessionId).emit('message-received', result.assistantMessage)
        }

      } catch (error) {
        console.error('Erro ao processar mensagem via WebSocket:', error)
        socket.emit('error', 'Erro ao processar sua mensagem. Tente novamente.')
      }
    })

    // Executar query
    socket.on('execute-query', async (data: { messageId: string, sessionId: string }) => {
      try {
        const { messageId, sessionId } = data

        // Notificar que a query está sendo executada
        socket.to(sessionId).emit('query-executing', 'Executando consulta...')

        // Processar query usando o ChatService
        const result = await chatService.processQuery(messageId)

        if (!result.success) {
          socket.to(sessionId).emit('query-error', result.error)
          return
        }

        // Enviar resultado para todos na sessão
        if (result.assistantMessage) {
          io.to(sessionId).emit('message-updated', result.assistantMessage)
        }

      } catch (error) {
        console.error('Erro ao executar query via WebSocket:', error)
        socket.emit('query-error', 'Erro ao executar consulta. Verifique os dados solicitados.')
      }
    })

    // Sair de uma sessão
    socket.on('disconnect-session', (sessionId: string) => {
      socket.leave(sessionId)
    })

    // Desconexão
    socket.on('disconnect', () => {
      // Cliente desconectado silenciosamente
    })
  })
}
