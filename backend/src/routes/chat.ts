import { Router } from 'express'
import { ChatRequest, ChatResponse } from '../types'
import { ChatService } from '../services/chat-service'
import { SessionService } from '../services/session-service'
import { LLMService } from '../services/llm-service'

const router = Router()

// Instâncias dos serviços
const chatService = ChatService.getInstance()
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

    // Processar mensagem usando o ChatService
    const result = await chatService.processMessage({
      sessionId,
      message,
      model
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
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router
