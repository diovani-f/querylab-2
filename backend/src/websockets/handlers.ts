import { Server, Socket } from 'socket.io'
import { WebSocketEvents, ChatRequest, Message, ChatSession } from '../types'
import { SessionService } from '../services/session-service'
import { LLMService } from '../services/llm-service'

const JSON_SERVER_URL = process.env.JSON_SERVER_URL || 'http://localhost:3001'

// Funções auxiliares para trabalhar com o banco de dados
async function getSessionFromDatabase(sessionId: string): Promise<ChatSession | null> {
  // Agora usar o SessionService que já carrega do JSON Server
  const sessionService = SessionService.getInstance()
  await sessionService.loadSessions() // Garantir que as sessões estão carregadas
  return sessionService.getSession(sessionId)
}

async function createSessionInDatabase(userId: number | string, title: string, model?: string): Promise<ChatSession | null> {
  // Usar o SessionService para criar a sessão
  const sessionService = SessionService.getInstance()

  const modelObj = {
    id: model || 'llama3-70b-8192',
    name: 'Llama 3 70B',
    description: 'Modelo padrão para consultas SQL',
    provider: 'groq' as const,
    maxTokens: 8192,
    isDefault: true
  }

  try {
    return await sessionService.createSession(title, modelObj, userId)
  } catch (error) {
    console.error('Erro ao criar sessão:', error)
    return null
  }
}

async function addMessageToDatabase(sessionId: string, messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null> {
  // Usar o SessionService para adicionar a mensagem
  const sessionService = SessionService.getInstance()

  try {
    return await sessionService.addMessage(sessionId, messageData)
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error)
    return null
  }
}

async function saveToHistory(userId: number, sessionId: string, consulta: string, sqlGerado: string, resultado: any, modeloUsado: string): Promise<void> {
  try {
    const historyItem = {
      usuario_id: userId,
      sessao_id: sessionId,
      consulta,
      sql_gerado: sqlGerado,
      resultado,
      modelo_usado: modeloUsado,
      timestamp: new Date().toISOString(),
      is_favorito: false,
      tags: []
    }

    await fetch(`${JSON_SERVER_URL}/historico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyItem)
    })
  } catch (error) {
    console.error('Erro ao salvar no histórico:', error)
  }
}

export function setupWebSocketHandlers(io: Server) {
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

        // Verificar se a sessão existe no banco de dados
        let session = await getSessionFromDatabase(sessionId)
        if (!session && userId) {
          // Criar nova sessão no banco se não existir
          session = await createSessionInDatabase(userId, `Sessão ${new Date().toLocaleString('pt-BR')}`, model)
        }

        if (!session) {
          socket.emit('error', 'Sessão não encontrada e usuário não identificado')
          return
        }

        // Usar o ID da sessão
        const actualSessionId = session.id

        // Notificar que a mensagem está sendo processada
        socket.to(actualSessionId).emit('message-processing', 'Processando sua consulta...')

        // Adicionar mensagem do usuário no banco
        const userMessage = await addMessageToDatabase(actualSessionId, {
          type: 'user',
          content: message
        })

        if (userMessage) {
          // Enviar mensagem do usuário para todos na sessão
          io.to(actualSessionId).emit('message-received', userMessage)
        }

        // Gerar SQL usando LLM real
        const llmService = LLMService.getInstance()
        const llmResponse = await llmService.generateSQL({
          prompt: message,
          model: model || 'llama3-70b-8192',
          context: { schema: 'universidades' }
        })

        console.log(`🤖 Resposta do LLM:`, {
          success: llmResponse.success,
          sqlQuery: llmResponse.sqlQuery,
          error: llmResponse.error
        })

        if (!llmResponse.success) {
          // Enviar mensagem de erro
          const errorMessage = await addMessageToDatabase(actualSessionId, {
            type: 'error',
            content: `Erro ao processar consulta: ${llmResponse.error}`
          })

          if (errorMessage) {
            io.to(actualSessionId).emit('message-received', errorMessage)
          }
          return
        }

        // Verificar se é uma explicação ou SQL
        if (llmResponse.explanation && !llmResponse.sqlQuery) {
          // É uma explicação (não uma consulta SQL) - sem dados simulados
          const assistantMessage = await addMessageToDatabase(actualSessionId, {
            type: 'assistant',
            content: llmResponse.explanation
            // Não incluir sqlQuery nem queryResult para explicações
          })

          if (assistantMessage) {
            io.to(actualSessionId).emit('message-received', assistantMessage)
          }
          return
        }

        // Executar SQL gerado
        const queryResult = await simulateQueryExecution(llmResponse.sqlQuery!)

        // Criar mensagem de resposta mais informativa
        const responseContent = `Consulta processada com sucesso!

**SQL Gerado:**
\`\`\`sql
${llmResponse.sqlQuery}
\`\`\`

**Resultado:** ${queryResult.rowCount} registro(s) encontrado(s)
**Tempo de execução:** ${queryResult.executionTime}ms`

        // Adicionar mensagem de resposta no banco
        const assistantMessage = await addMessageToDatabase(actualSessionId, {
          type: 'assistant',
          content: responseContent,
          sqlQuery: llmResponse.sqlQuery,
          queryResult
        })

        if (assistantMessage) {
          // Enviar resposta para todos na sessão
          io.to(actualSessionId).emit('message-received', assistantMessage)
        }

        // Salvar no histórico também
        if (userId && llmResponse.sqlQuery) {
          await saveToHistory(userId, actualSessionId, message, llmResponse.sqlQuery, queryResult, model || 'llama3-70b-8192')
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
  const executionTime = Math.floor(Math.random() * 200) + 50 // 50-250ms
  await new Promise(resolve => setTimeout(resolve, executionTime))

  // Analisar o SQL para gerar dados mais apropriados
  const sqlLower = sql.toLowerCase()

  // Se for COUNT, retornar número
  if (sqlLower.includes('count(')) {
    const count = Math.floor(Math.random() * 50) + 1
    return {
      columns: ['total'],
      rows: [[count]],
      rowCount: 1,
      executionTime
    }
  }

  // Se for sobre universidades federais
  if (sqlLower.includes('federal')) {
    return {
      columns: ['id', 'nome', 'tipo', 'regiao'],
      rows: [
        [1, 'Universidade Federal do Rio de Janeiro', 'Federal', 'Sudeste'],
        [3, 'Universidade Federal de Minas Gerais', 'Federal', 'Sudeste'],
        [4, 'Universidade Federal do Rio Grande do Sul', 'Federal', 'Sul'],
        [5, 'Universidade de Brasília', 'Federal', 'Centro-Oeste'],
        [6, 'Universidade Federal da Bahia', 'Federal', 'Nordeste']
      ],
      rowCount: 5,
      executionTime
    }
  }

  // Se for sobre cursos
  if (sqlLower.includes('curso')) {
    return {
      columns: ['id', 'nome', 'tipo', 'duracao'],
      rows: [
        [1, 'Ciência da Computação', 'Bacharelado', '4 anos'],
        [2, 'Engenharia Civil', 'Bacharelado', '5 anos'],
        [3, 'Medicina', 'Bacharelado', '6 anos'],
        [4, 'Direito', 'Bacharelado', '5 anos']
      ],
      rowCount: 4,
      executionTime
    }
  }

  // Se for sobre professores
  if (sqlLower.includes('professor')) {
    return {
      columns: ['id', 'nome', 'departamento', 'titulacao'],
      rows: [
        [1, 'Dr. João Silva', 'Computação', 'Doutor'],
        [2, 'Dra. Maria Santos', 'Matemática', 'Doutora'],
        [3, 'Dr. Pedro Costa', 'Física', 'Doutor']
      ],
      rowCount: 3,
      executionTime
    }
  }

  // Dados padrão para outras consultas
  return {
    columns: ['id', 'nome', 'tipo', 'regiao'],
    rows: [
      [1, 'Universidade Federal do Rio de Janeiro', 'Federal', 'Sudeste'],
      [2, 'Universidade de São Paulo', 'Estadual', 'Sudeste'],
      [3, 'Universidade Federal de Minas Gerais', 'Federal', 'Sudeste']
    ],
    rowCount: 3,
    executionTime
  }
}
