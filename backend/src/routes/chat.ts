import { Router } from 'express'
import { ChatRequest, ChatResponse, Message } from '../types'
import { DatabaseService } from '../services/database-service'
import { SessionService } from '../services/session-service'

const router = Router()

// Instâncias dos serviços
const dbService = DatabaseService.getInstance()
const sessionService = SessionService.getInstance()

router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, model }: ChatRequest = req.body

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'SessionId e message são obrigatórios'
      })
    }

    // Verificar se a sessão existe
    let session = sessionService.getSession(sessionId)
    if (!session) {
      // Criar nova sessão se não existir
      session = sessionService.createSession(`Sessão ${new Date().toLocaleString('pt-BR')}`)
    }

    // Usar o ID da sessão (pode ser o original ou o da nova sessão criada)
    const actualSessionId = session.id

    // Adicionar mensagem do usuário
    const userMessage = sessionService.addMessage(actualSessionId, {
      type: 'user',
      content: message
    })

    if (!userMessage) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar mensagem do usuário'
      })
    }

    // Simular processamento de LLM (será substituído por integração real)
    const sqlQuery = await simulateLLMResponse(message)

    // Simular execução de query (será substituído por integração com banco)
    const queryResult = await simulateQueryExecution(sqlQuery)

    // Adicionar mensagem de resposta
    const assistantMessage = sessionService.addMessage(actualSessionId, {
      type: 'assistant',
      content: `Consulta processada com sucesso. Encontrei ${queryResult.rowCount} resultados.`,
      sqlQuery,
      queryResult
    })

    if (!assistantMessage) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar mensagem de resposta'
      })
    }

    const response: ChatResponse = {
      success: true,
      message: assistantMessage
    }

    res.json(response)
  } catch (error) {
    console.error('Erro ao processar mensagem:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

router.get('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params

  const session = sessionService.getSession(sessionId)
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Sessão não encontrada'
    })
  }

  res.json({
    success: true,
    session
  })
})

// Funções auxiliares (temporárias)
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

async function simulateLLMResponse(prompt: string): Promise<string> {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Gerar SQL simples baseado no prompt
  if (prompt.toLowerCase().includes('universidade')) {
    return 'SELECT * FROM universidades WHERE nome LIKE \'%universidade%\' LIMIT 10;'
  } else if (prompt.toLowerCase().includes('professor')) {
    return 'SELECT * FROM pessoas WHERE tipo = \'professor\' LIMIT 10;'
  } else {
    return 'SELECT * FROM universidades LIMIT 5;'
  }
}

async function simulateQueryExecution(sql: string): Promise<any> {
  try {
    // Tentar executar query real usando DatabaseService
    const result = await dbService.executeQuery(sql)
    return result
  } catch (error) {
    console.error('Erro ao executar query no banco de dados:', error)

    // Fallback para dados simulados
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      columns: ['id', 'nome', 'tipo', 'regiao'],
      rows: [
        [1, 'Universidade Federal do Rio de Janeiro', 'Federal', 'Sudeste'],
        [2, 'Universidade de São Paulo', 'Estadual', 'Sudeste'],
        [3, 'Universidade Federal de Minas Gerais', 'Federal', 'Sudeste']
      ],
      rowCount: 3,
      executionTime: 45
    }
  }
}

export default router
