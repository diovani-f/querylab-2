import { Server, Socket } from 'socket.io'
import { WebSocketEvents, ChatRequest, Message, ChatSession } from '../types'
import { SessionService } from '../services/session-service'
import { DatabaseService } from '../services/database-service'
import { LLMService } from '../services/llm-service'

const JSON_SERVER_URL = process.env.JSON_SERVER_URL || 'http://localhost:3001'

// Funções auxiliares para trabalhar com o banco de dados
async function getSessionFromDatabase(sessionId: string): Promise<ChatSession | null> {
  try {
    const response = await fetch(`${JSON_SERVER_URL}/sessoes/${sessionId}`)
    if (!response.ok) return null

    const sessionData = await response.json()
    return {
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
  } catch (error) {
    console.error('Erro ao buscar sessão:', error)
    return null
  }
}

async function createSessionInDatabase(userId: number, title: string, model?: string): Promise<ChatSession | null> {
  try {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    const sessionData = {
      id: sessionId,
      titulo: title,
      usuario_id: userId,
      created_at: now,
      updated_at: now,
      modelo: {
        id: model || 'llama3-70b-8192',
        name: 'Llama 3 70B',
        description: 'Modelo padrão para consultas SQL',
        provider: 'groq',
        maxTokens: 8192,
        isDefault: true
      },
      mensagens: [],
      is_favorita: false,
      tags: []
    }

    const response = await fetch(`${JSON_SERVER_URL}/sessoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    })

    if (!response.ok) return null

    return {
      id: sessionId,
      title,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      messages: [],
      model: {
        id: model || 'llama3-70b-8192',
        name: 'Llama 3 70B',
        description: 'Modelo padrão para consultas SQL',
        provider: 'groq',
        maxTokens: 8192,
        isDefault: true
      }
    }
  } catch (error) {
    console.error('Erro ao criar sessão:', error)
    return null
  }
}

async function addMessageToDatabase(sessionId: string, messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null> {
  try {
    // Primeiro, buscar a sessão atual
    const sessionResponse = await fetch(`${JSON_SERVER_URL}/sessoes/${sessionId}`)
    if (!sessionResponse.ok) return null

    const session = await sessionResponse.json()

    // Criar nova mensagem
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      tipo: messageData.type,
      conteudo: messageData.content,
      timestamp: new Date().toISOString(),
      sql_query: messageData.sqlQuery,
      query_result: messageData.queryResult
    }

    // Adicionar mensagem à lista
    const updatedMessages = [...(session.mensagens || []), newMessage]

    // Atualizar sessão no banco
    const updateResponse = await fetch(`${JSON_SERVER_URL}/sessoes/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagens: updatedMessages,
        updated_at: new Date().toISOString()
      })
    })

    if (!updateResponse.ok) return null

    return {
      id: newMessage.id,
      type: messageData.type,
      content: messageData.content,
      timestamp: new Date(newMessage.timestamp),
      sqlQuery: messageData.sqlQuery,
      queryResult: messageData.queryResult
    }
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
          const errorMessage = sessionService.addMessage(actualSessionId, {
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
