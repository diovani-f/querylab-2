'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, CheckCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react'
import { QueryEvaluation } from '@/types'
import { apiService } from '@/lib/api'

interface EvaluationTriggerProps {
  messageId: string
  evaluation?: QueryEvaluation | null
  onClick?: () => void
}

export function EvaluationTrigger({ messageId, evaluation: propEvaluation, onClick }: EvaluationTriggerProps) {
  const [evaluation, setEvaluation] = useState<QueryEvaluation | null>(propEvaluation || null)
  const [isLoading, setIsLoading] = useState(!propEvaluation)

  useEffect(() => {
    // Se já temos a avaliação via props, não precisamos carregar
    if (propEvaluation) {
      setEvaluation(propEvaluation)
      setIsLoading(false)
    } else {
      loadEvaluation()
    }
  }, [messageId, propEvaluation])

  const loadEvaluation = async () => {
    try {
      setIsLoading(true)
      const data = await apiService.getEvaluationByMessage(messageId)
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation)
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = () => {
    if (evaluation) {
      if (evaluation.isApproved) return <CheckCircle className="h-3 w-3 text-green-500" />
      if (evaluation.needsReview) return <AlertCircle className="h-3 w-3 text-yellow-500" />
      return <Clock className="h-3 w-3 text-blue-500" />
    }
    return <BarChart3 className="h-3 w-3 text-muted-foreground" />
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="text-xs" disabled>
        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
        Carregando...
      </Button>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={onClick}
      >
        {getStatusIcon()}
        <span className="ml-1">
          {evaluation ? 'Ver Avaliação' : 'Avaliar Consulta'}
        </span>
      </Button>

      {evaluation && (
        <Badge variant="outline" className={getScoreColor(evaluation.overallScore)}>
          <Star className="h-3 w-3 mr-1" />
          {evaluation.overallScore.toFixed(1)}
        </Badge>
      )}
    </div>
  )
}
