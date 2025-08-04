import { Router } from 'express'
import { ChatRequest, ChatResponse, Message } from '../types'
import { DatabaseService } from '../services/database-service'
import { SessionService } from '../services/session-service'
import { LLMService } from '../services/llm-service'

const router = Router()

// Instâncias dos serviços
const dbService = DatabaseService.getInstance()
const sessionService = SessionService.getInstance()
// LLMService será inicializado quando necessário

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
      session = await sessionService.createSession(`Sessão ${new Date().toLocaleString('pt-BR')}`)
    }

    // Usar o ID da sessão (pode ser o original ou o da nova sessão criada)
    const actualSessionId = session.id

    // Adicionar mensagem do usuário
    const userMessage = await sessionService.addMessage(actualSessionId, {
      type: 'user',
      content: message
    })

    if (!userMessage) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar mensagem do usuário'
      })
    }

    // Gerar SQL usando LLM real
    const llmService = LLMService.getInstance()
    const llmResponse = await llmService.generateSQL({
      prompt: message,
      model: model || 'llama3-70b-8192',
      context: { schema: 'universidades' }
    })

    if (!llmResponse.success) {
      return res.status(500).json({
        success: false,
        error: `Erro ao processar consulta: ${llmResponse.error}`
      })
    }

    // Verificar se é uma explicação ou SQL
    if (llmResponse.explanation && !llmResponse.sqlQuery) {
      // É uma explicação (não uma consulta SQL) - sem dados simulados
      const assistantMessage = await sessionService.addMessage(actualSessionId, {
        type: 'assistant',
        content: llmResponse.explanation
        // Não incluir sqlQuery nem queryResult para explicações
      })

      return res.json({
        success: true,
        message: assistantMessage,
        session: sessionService.getSession(actualSessionId)
      })
    }

    // Simular execução de query (será substituído por integração com banco)
    const queryResult = await simulateQueryExecution(llmResponse.sqlQuery!)

    // Criar mensagem de resposta mais informativa
    const responseContent = `Consulta processada com sucesso!

**SQL Gerado:**
\`\`\`sql
${llmResponse.sqlQuery}
\`\`\`

**Resultado:** ${queryResult.rowCount} registro(s) encontrado(s)
**Tempo de execução:** ${queryResult.executionTime}ms`

    // Adicionar mensagem de resposta
    const assistantMessage = await sessionService.addMessage(actualSessionId, {
      type: 'assistant',
      content: responseContent,
      sqlQuery: llmResponse.sqlQuery,
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

// Listar modelos LLM disponíveis
router.get('/models', async (req, res) => {
  try {
    const llmService = LLMService.getInstance()
    const models = llmService.getAvailableModels()
    res.json({
      success: true,
      models
    })
  } catch (error) {
    console.error('Erro ao buscar modelos:', error)
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

export default router
