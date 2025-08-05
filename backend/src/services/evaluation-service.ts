import { EvaluationCriteria, QueryEvaluation, EvaluationSummary } from '../types'

const JSON_SERVER_URL = process.env.JSON_SERVER_URL || 'http://localhost:3001'

/**
 * Serviço responsável por gerenciar avaliações de retornos LLM
 */
export class EvaluationService {
  private static instance: EvaluationService
  private criteria: EvaluationCriteria[] = []

  private constructor() {
    this.initializeDefaultCriteria()
  }

  public static getInstance(): EvaluationService {
    if (!EvaluationService.instance) {
      EvaluationService.instance = new EvaluationService()
    }
    return EvaluationService.instance
  }

  /**
   * Inicializa critérios padrão de avaliação
   */
  private initializeDefaultCriteria() {
    this.criteria = [
      {
        id: 'sql_correctness',
        name: 'Correção do SQL',
        description: 'O SQL gerado está sintaticamente correto e executa sem erros?',
        weight: 0.3,
        type: 'boolean'
      },
      {
        id: 'query_accuracy',
        name: 'Precisão da Consulta',
        description: 'O SQL retorna exatamente os dados solicitados na pergunta?',
        weight: 0.25,
        type: 'scale',
        scaleMin: 1,
        scaleMax: 5
      },
      {
        id: 'performance',
        name: 'Performance',
        description: 'A consulta é eficiente e bem otimizada?',
        weight: 0.2,
        type: 'scale',
        scaleMin: 1,
        scaleMax: 5
      },
      {
        id: 'completeness',
        name: 'Completude',
        description: 'A resposta atende completamente à pergunta do usuário?',
        weight: 0.15,
        type: 'scale',
        scaleMin: 1,
        scaleMax: 5
      },
      {
        id: 'clarity',
        name: 'Clareza',
        description: 'O SQL é legível e bem estruturado?',
        weight: 0.1,
        type: 'scale',
        scaleMin: 1,
        scaleMax: 5
      }
    ]
  }

  /**
   * Retorna todos os critérios de avaliação
   */
  getCriteria(): EvaluationCriteria[] {
    return this.criteria
  }

  /**
   * Adiciona um novo critério de avaliação
   */
  addCriteria(criteria: Omit<EvaluationCriteria, 'id'>): EvaluationCriteria {
    const newCriteria: EvaluationCriteria = {
      ...criteria,
      id: this.generateId()
    }
    this.criteria.push(newCriteria)
    return newCriteria
  }

  /**
   * Salva uma avaliação no banco de dados
   */
  async saveEvaluation(evaluation: Omit<QueryEvaluation, 'id' | 'timestamp'>): Promise<QueryEvaluation> {
    const newEvaluation: QueryEvaluation = {
      ...evaluation,
      id: this.generateId(),
      timestamp: new Date()
    }

    try {
      const response = await fetch(`${JSON_SERVER_URL}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvaluation)
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar avaliação')
      }

      return newEvaluation
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error)
      throw error
    }
  }

  /**
   * Busca avaliações por sessão
   */
  async getEvaluationsBySession(sessionId: string): Promise<QueryEvaluation[]> {
    try {
      const response = await fetch(`${JSON_SERVER_URL}/evaluations?sessionId=${sessionId}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar avaliações')
      }
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error)
      return []
    }
  }

  /**
   * Busca avaliação por ID da mensagem
   */
  async getEvaluationByMessage(messageId: string): Promise<QueryEvaluation | null> {
    try {
      const response = await fetch(`${JSON_SERVER_URL}/evaluations?messageId=${messageId}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar avaliação')
      }
      const evaluations = await response.json()
      return evaluations.length > 0 ? evaluations[0] : null
    } catch (error) {
      console.error('Erro ao buscar avaliação:', error)
      return null
    }
  }

  /**
   * Calcula resumo de avaliações
   */
  async getEvaluationSummary(sessionId?: string): Promise<EvaluationSummary> {
    try {
      const url = sessionId 
        ? `${JSON_SERVER_URL}/evaluations?sessionId=${sessionId}`
        : `${JSON_SERVER_URL}/evaluations`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Erro ao buscar avaliações')
      }
      
      const evaluations: QueryEvaluation[] = await response.json()
      
      if (evaluations.length === 0) {
        return {
          totalEvaluations: 0,
          averageScore: 0,
          correctnessRate: 0,
          approvalRate: 0,
          criteriaAverages: []
        }
      }

      const totalEvaluations = evaluations.length
      const averageScore = evaluations.reduce((sum, evaluation) => sum + evaluation.overallScore, 0) / totalEvaluations
      const correctnessRate = evaluations.filter(evaluation => evaluation.isCorrect).length / totalEvaluations
      const approvalRate = evaluations.filter(evaluation => evaluation.isApproved).length / totalEvaluations

      // Calcular médias por critério
      const criteriaAverages = this.criteria.map(criteria => {
        const criteriaEvals = evaluations.flatMap(evaluation =>
          evaluation.criteriaEvaluations.filter(ce => ce.criteriaId === criteria.id)
        )

        if (criteriaEvals.length === 0) {
          return { criteriaId: criteria.id, average: 0 }
        }

        const sum = criteriaEvals.reduce((acc, ce) => {
          if (criteria.type === 'boolean') {
            return acc + (ce.value ? 1 : 0)
          } else if (criteria.type === 'scale') {
            return acc + (typeof ce.value === 'number' ? ce.value : 0)
          }
          return acc
        }, 0)

        return {
          criteriaId: criteria.id,
          average: sum / criteriaEvals.length
        }
      })

      return {
        totalEvaluations,
        averageScore,
        correctnessRate,
        approvalRate,
        criteriaAverages
      }
    } catch (error) {
      console.error('Erro ao calcular resumo:', error)
      throw error
    }
  }

  /**
   * Calcula score automático baseado nos critérios
   */
  calculateOverallScore(criteriaEvaluations: QueryEvaluation['criteriaEvaluations']): number {
    let totalScore = 0
    let totalWeight = 0

    for (const criteria of this.criteria) {
      const evaluation = criteriaEvaluations.find(ce => ce.criteriaId === criteria.id)
      if (!evaluation) continue

      let normalizedScore = 0
      if (criteria.type === 'boolean') {
        normalizedScore = evaluation.value ? 10 : 0
      } else if (criteria.type === 'scale' && typeof evaluation.value === 'number') {
        const min = criteria.scaleMin || 1
        const max = criteria.scaleMax || 5
        normalizedScore = ((evaluation.value - min) / (max - min)) * 10
      }

      totalScore += normalizedScore * criteria.weight
      totalWeight += criteria.weight
    }

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}
