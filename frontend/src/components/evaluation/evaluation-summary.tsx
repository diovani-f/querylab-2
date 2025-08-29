'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/ui/card'
import { Badge } from 'src/components/ui/badge'
import { Progress } from 'src/components/ui/progress'
import { Star, CheckCircle, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react'
import { EvaluationSummary, EvaluationCriteria } from '@/types'
import { apiService } from '@/lib/api'

interface EvaluationSummaryProps {
  sessionId?: string
}

export function EvaluationSummaryComponent({ sessionId }: EvaluationSummaryProps) {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null)
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSummary()
    loadCriteria()
  }, [sessionId])

  const loadSummary = async () => {
    try {
      setIsLoading(true)
      const data = await apiService.getEvaluationSummary(sessionId)
      if (data.success) {
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCriteria = async () => {
    try {
      const data = await apiService.getEvaluationCriteria()
      if (data.success) {
        setCriteria(data.criteria)
      }
    } catch (error) {
      console.error('Erro ao carregar critérios:', error)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (value: number) => {
    if (value >= 0.8) return 'bg-green-500'
    if (value >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando resumo...</div>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.totalEvaluations === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Resumo de Avaliações</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Nenhuma avaliação encontrada
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Métricas Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Resumo de Avaliações</span>
            <Badge variant="outline">{summary.totalEvaluations} avaliações</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Score Médio */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Score Médio</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(summary.averageScore)}`}>
                {summary.averageScore.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">de 10</div>
            </div>

            {/* Taxa de Correção */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Correção</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {(summary.correctnessRate * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">corretas</div>
            </div>

            {/* Taxa de Aprovação */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Aprovação</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {(summary.approvalRate * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">aprovadas</div>
            </div>

            {/* Taxa de Revisão */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Revisão</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {((1 - summary.approvalRate) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">precisam revisão</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avaliação por Critério */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliação por Critério</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {criteria.map((criterion) => {
              const average = summary.criteriaAverages.find(
                ca => ca.criteriaId === criterion.id
              )?.average || 0

              // Normalizar para 0-1 baseado no tipo
              let normalizedValue = 0
              let displayValue = ''

              if (criterion.type === 'boolean') {
                normalizedValue = average
                displayValue = `${(average * 100).toFixed(0)}%`
              } else if (criterion.type === 'scale') {
                const min = criterion.scaleMin || 1
                const max = criterion.scaleMax || 5
                normalizedValue = (average - min) / (max - min)
                displayValue = `${average.toFixed(1)}/${max}`
              }

              return (
                <div key={criterion.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{criterion.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Peso: {(criterion.weight * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{displayValue}</div>
                      <div className="text-xs text-muted-foreground">
                        {criterion.type === 'boolean' ? 'aprovação' : 'média'}
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={normalizedValue * 100}
                    className="h-2"
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
