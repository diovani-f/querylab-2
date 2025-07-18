import { Server, Socket } from 'socket.io'
import { WebSocketEvents, ChatRequest, Message } from '../types'
import { SessionService } from '../services/session-service'
import { DatabaseService } from '../services/database-service'

export function setupWebSocketHandlers(io: Server) {
  const sessionService = SessionService.getInstance()
  const dbService = DatabaseService.getInstance()

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`)

    // Entrar em uma sessão
    socket.on('join-session', (sessionId: string) => {
      socket.join(sessionId)
      socket.emit('session-joined', sessionId)
      console.log(`📝 Cliente ${socket.id} entrou na sessão: ${sessionId}`)
    })

    // Processar mensagem de chat
    socket.on('send-message', async (data: ChatRequest) => {
      try {
        const { sessionId, message, model } = data

        // Verificar se a sessão existe
        let session = sessionService.getSession(sessionId)
        if (!session) {
          // Criar nova sessão se não existir
          session = sessionService.createSession(`Sessão ${new Date().toLocaleString('pt-BR')}`)
        }

        // Usar o ID da sessão (pode ser o original ou o da nova sessão criada)
        const actualSessionId = session.id

        // Notificar que a mensagem está sendo processada
        socket.to(actualSessionId).emit('message-processing', 'Processando sua consulta...')

        // Adicionar mensagem do usuário
        const userMessage = sessionService.addMessage(actualSessionId, {
          type: 'user',
          content: message
        })

        if (userMessage) {
          // Enviar mensagem do usuário para todos na sessão
          io.to(actualSessionId).emit('message-received', userMessage)
        }

        // Simular processamento (será substituído por LLM real)
        const sqlQuery = await simulateLLMResponse(message)
        const queryResult = await simulateQueryExecution(sqlQuery)

        // Adicionar mensagem de resposta
        const assistantMessage = sessionService.addMessage(actualSessionId, {
          type: 'assistant',
          content: `Consulta processada com sucesso. SQL gerado e executado.`,
          sqlQuery,
          queryResult
        })

        if (assistantMessage) {
          // Enviar resposta para todos na sessão
          io.to(actualSessionId).emit('message-received', assistantMessage)
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

// Funções auxiliares (temporárias - serão movidas para services)
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

async function simulateLLMResponse(prompt: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1500))

  if (prompt.toLowerCase().includes('universidade')) {
    return 'SELECT * FROM universidades WHERE nome LIKE \'%universidade%\' LIMIT 10;'
  } else if (prompt.toLowerCase().includes('professor')) {
    return 'SELECT * FROM pessoas WHERE tipo = \'professor\' LIMIT 10;'
  } else if (prompt.toLowerCase().includes('aluno')) {
    return 'SELECT * FROM pessoas WHERE tipo = \'aluno\' LIMIT 10;'
  } else {
    return 'SELECT * FROM universidades LIMIT 5;'
  }
}

async function simulateQueryExecution(sql: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 800))

  return {
    columns: ['id', 'nome', 'tipo', 'regiao'],
    rows: [
      [1, 'Universidade Federal do Rio de Janeiro', 'Federal', 'Sudeste'],
      [2, 'Universidade de São Paulo', 'Estadual', 'Sudeste'],
      [3, 'Universidade Federal de Minas Gerais', 'Federal', 'Sudeste'],
      [4, 'Universidade Federal do Rio Grande do Sul', 'Federal', 'Sul'],
      [5, 'Universidade de Brasília', 'Federal', 'Centro-Oeste']
    ],
    rowCount: 5,
    executionTime: 67
  }
}
