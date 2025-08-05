import { Router } from 'express'
import { EvaluationService } from '../services/evaluation-service'
import { QueryEvaluation } from '../types'

const router = Router()
const evaluationService = EvaluationService.getInstance()

// Listar critérios de avaliação
router.get('/criteria', (req, res) => {
  try {
    const criteria = evaluationService.getCriteria()
    res.json({
      success: true,
      criteria
    })
  } catch (error) {
    console.error('Erro ao buscar critérios:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Adicionar novo critério
router.post('/criteria', (req, res) => {
  try {
    const { name, description, weight, type, scaleMin, scaleMax } = req.body

    if (!name || !description || weight === undefined || !type) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: name, description, weight, type'
      })
    }

    const criteria = evaluationService.addCriteria({
      name,
      description,
      weight,
      type,
      scaleMin,
      scaleMax
    })

    res.json({
      success: true,
      criteria
    })
  } catch (error) {
    console.error('Erro ao adicionar critério:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Salvar avaliação
router.post('/evaluate', async (req, res) => {
  try {
    const {
      sessionId,
      messageId,
      evaluatorId,
      evaluatorName,
      originalQuery,
      generatedSQL,
      queryResult,
      criteriaEvaluations,
      overallComment,
      isCorrect,
      needsReview,
      isApproved
    } = req.body

    if (!sessionId || !messageId || !evaluatorId || !evaluatorName || !criteriaEvaluations) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: sessionId, messageId, evaluatorId, evaluatorName, criteriaEvaluations'
      })
    }

    // Calcular score automático
    const overallScore = evaluationService.calculateOverallScore(criteriaEvaluations)

    const evaluation = await evaluationService.saveEvaluation({
      sessionId,
      messageId,
      evaluatorId,
      evaluatorName,
      originalQuery,
      generatedSQL,
      queryResult,
      criteriaEvaluations,
      overallScore,
      overallComment,
      isCorrect: isCorrect !== undefined ? isCorrect : overallScore >= 7,
      needsReview: needsReview !== undefined ? needsReview : overallScore < 5,
      isApproved: isApproved !== undefined ? isApproved : overallScore >= 8
    })

    res.json({
      success: true,
      evaluation
    })
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Buscar avaliações por sessão
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const evaluations = await evaluationService.getEvaluationsBySession(sessionId)
    
    res.json({
      success: true,
      evaluations
    })
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Buscar avaliação por mensagem
router.get('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params
    const evaluation = await evaluationService.getEvaluationByMessage(messageId)
    
    res.json({
      success: true,
      evaluation
    })
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Resumo de avaliações - geral
router.get('/summary', async (req, res) => {
  try {
    const summary = await evaluationService.getEvaluationSummary()

    res.json({
      success: true,
      summary
    })
  } catch (error) {
    console.error('Erro ao calcular resumo:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// Resumo de avaliações - por sessão
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const summary = await evaluationService.getEvaluationSummary(sessionId)

    res.json({
      success: true,
      summary
    })
  } catch (error) {
    console.error('Erro ao calcular resumo:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router
