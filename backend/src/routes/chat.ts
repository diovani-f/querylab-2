import { Router } from 'express'
import { ChatRequest, ChatResponse } from '../types'
import { ChatService } from '../services/chat-service'
import { SessionService } from '../services/session-service'
import { LLMService } from '../services/llm-service'
import { SQLGenerationService } from '../services/sql-generation-service'

const router = Router()

// Instâncias dos serviços
const chatService = ChatService.getInstance()
const sessionService = SessionService.getInstance()
const sqlGenerationService = SQLGenerationService.getInstance()

router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, model, userId, autoExecuteSQL } = req.body

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'SessionId e message são obrigatórios'
      })
    }

    // Processar mensagem usando o ChatService
    const result = await chatService.processMessage({
      sessionId,
      message,
      model,
      userId: userId || 'anonymous-user',
      autoExecuteSQL: autoExecuteSQL !== undefined ? autoExecuteSQL : true // Default true para compatibilidade
    })

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      })
    }

    const response: ChatResponse = {
      success: true,
      message: result.assistantMessage!
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

router.get('/sessions/:sessionId', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Erro ao buscar sessão:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

router.patch('/execute', async(req, res) => {
  try {
    const { messageId } = req.body

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'messageId é obrigatório'
      })
    }

    const message = await chatService.processQuery(messageId)

    if(!message.success){
      console.error('[ERRO]: ', message.error || 'Erro ao executar query')
      return res.status(500).json({
        success: false,
        error: message.error || 'Erro ao executar query'
      })
    }

    res.json({
      success: true,
      data: message.assistantMessage
    })

  } catch (error) {
    console.error('Erro ao executar query', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Endpoint para geração paralela de SQL com 3 modelos
router.post('/generate-sql-parallel', async (req, res) => {
  try {
    const { sessionId, question } = req.body

    if (!sessionId || !question) {
      return res.status(400).json({
        success: false,
        error: 'sessionId e question são obrigatórios'
      })
    }

    // Obter histórico da sessão
    const session = await sessionService.getSession(sessionId)

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      })
    }

    const conversationHistory = session.mensagens || []

    // Gerar SQL em paralelo
    console.log('📡 Chamando generateSQLParallel...', { question, sessionId })
    const result = await sqlGenerationService.generateSQLParallel({
      question,
      model: 'parallel', // Não usado, mas necessário para a interface
      sessionId,
      conversationHistory
    })

    console.log('📤 Retornando resultado:', {
      success: result.success,
      resultsCount: result.results?.length,
      hasResults: !!result.results
    })

    res.json(result)

  } catch (error) {
    console.error('Erro ao gerar SQL paralelo:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      results: []
    })
  }
})

// Endpoint para salvar resultado paralelo selecionado
router.post('/save-parallel-result', async (req, res) => {
  try {
    const { sessionId, result } = req.body

    if (!sessionId || !result) {
      return res.status(400).json({
        success: false,
        error: 'sessionId e result são obrigatórios'
      })
    }

    console.log('💾 Salvando resultado paralelo selecionado:', {
      sessionId,
      provider: result.provider,
      hasSql: !!result.sql,
      hasData: !!result.data
    })

    // Salvar mensagem do assistente no banco
    const messageData = await chatService.addMessage(
      sessionId,
      {
        type: 'assistant',
        content: result.explanation || `SQL gerado pelo ${result.provider}`
      },
      {
        sqlQuery: result.sql,
        explanation: result.explanation,
        queryResult: {
          success: result.executionSuccess || false,
          columns: result.columns || [],
          data: result.data || [],
          rowCount: result.rowCount || 0,
          executionTime: result.executionTime || 0
        }
      }
    )

    console.log('✅ Mensagem salva no banco:', messageData.id)

    res.json({
      success: true,
      message: messageData
    })

  } catch (error) {
    console.error('❌ Erro ao salvar resultado paralelo:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar resultado paralelo'
    })
  }
})

// Endpoint para gerar resumo analítico (reverse translation)
router.post('/generate-summary', async (req, res) => {
  try {
    const { sql, result, originalPrompt } = req.body

    if (!sql || !result) {
      return res.status(400).json({
        success: false,
        error: 'sql e result são obrigatórios'
      })
    }

    console.log('🔄 Gerando resumo analítico...', {
      hasSql: !!sql,
      hasResult: !!result,
      rowCount: result.rowCount
    })

    const llmService = LLMService.getInstance()

    // Gerar reverse translation
    const reverseTranslation = await llmService.generateReverseTranslation({
      sql,
      result,
      originalPrompt: originalPrompt || 'Consulta SQL'
    })

    console.log('✅ Resumo analítico gerado:', reverseTranslation.substring(0, 100) + '...')

    res.json({
      success: true,
      reverseTranslation
    })

  } catch (error) {
    console.error('❌ Erro ao gerar resumo:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar resumo analítico'
    })
  }
})

export default router
