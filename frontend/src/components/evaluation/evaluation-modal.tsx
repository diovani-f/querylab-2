'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Star, CheckCircle, AlertCircle, Clock, Send, BarChart3 } from 'lucide-react'
import { EvaluationCriteria, QueryEvaluation, Message } from '@/types'
import { apiService } from '@/lib/api'

interface EvaluationModalProps {
  message: Message
  sessionId: string
  onEvaluationSaved?: (evaluation: QueryEvaluation) => void
  children: React.ReactNode // Trigger button
}

export function EvaluationModal({ message, sessionId, onEvaluationSaved, children }: EvaluationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([])
  const [evaluation, setEvaluation] = useState<QueryEvaluation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Estado do formulário de avaliação
  const [criteriaValues, setCriteriaValues] = useState<Record<string, boolean | number | string>>({})
  const [criteriaComments, setCriteriaComments] = useState<Record<string, string>>({})
  const [overallComment, setOverallComment] = useState('')
  const [isCorrect, setIsCorrect] = useState(true)
  const [needsReview, setNeedsReview] = useState(false)
  const [isApproved, setIsApproved] = useState(true)

  // Carregar critérios e avaliação existente quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadCriteria()
      loadExistingEvaluation()
    }
  }, [isOpen, message.id])

  const loadCriteria = async () => {
    try {
      const data = await apiService.getEvaluationCriteria()
      if (data.success) {
        setCriteria(data.criteria)
        // Inicializar valores padrão
        const defaultValues: Record<string, boolean | number | string> = {}
        data.criteria.forEach((c: EvaluationCriteria) => {
          if (c.type === 'boolean') {
            defaultValues[c.id] = true
          } else if (c.type === 'scale') {
            defaultValues[c.id] = Math.ceil(((c.scaleMax || 5) + (c.scaleMin || 1)) / 2)
          } else {
            defaultValues[c.id] = ''
          }
        })
        setCriteriaValues(defaultValues)
      }
    } catch (error) {
      console.error('Erro ao carregar critérios:', error)
    }
  }

  const loadExistingEvaluation = async () => {
    try {
      setIsLoading(true)
      const data = await apiService.getEvaluationByMessage(message.id)
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation)
        // Preencher formulário com dados existentes
        const values: Record<string, boolean | number | string> = {}
        const comments: Record<string, string> = {}
        data.evaluation.criteriaEvaluations.forEach((ce: any) => {
          values[ce.criteriaId] = ce.value
          if (ce.comment) comments[ce.criteriaId] = ce.comment
        })
        setCriteriaValues(values)
        setCriteriaComments(comments)
        setOverallComment(data.evaluation.overallComment || '')
        setIsCorrect(data.evaluation.isCorrect)
        setNeedsReview(data.evaluation.needsReview)
        setIsApproved(data.evaluation.isApproved)
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveEvaluation = async () => {
    if (!message.sqlQuery || !message.queryResult) return

    try {
      setIsSaving(true)
      
      const criteriaEvaluations = criteria.map(c => ({
        criteriaId: c.id,
        value: criteriaValues[c.id],
        comment: criteriaComments[c.id] || undefined
      }))

      const evaluationData = {
        sessionId,
        messageId: message.id,
        evaluatorId: 'current-user', // TODO: Pegar do contexto de autenticação
        evaluatorName: 'Especialista', // TODO: Pegar do contexto de autenticação
        originalQuery: message.content, // Assumindo que a mensagem anterior é a pergunta
        generatedSQL: message.sqlQuery,
        queryResult: message.queryResult,
        criteriaEvaluations,
        overallComment,
        isCorrect,
        needsReview,
        isApproved
      }

      const data = await apiService.saveEvaluation(evaluationData)
      
      if (data.success) {
        setEvaluation(data.evaluation)
        onEvaluationSaved?.(data.evaluation)
        setIsOpen(false)
      } else {
        console.error('Erro ao salvar avaliação:', data.error)
      }
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = () => {
    if (evaluation) {
      if (evaluation.isApproved) return <CheckCircle className="h-4 w-4 text-green-500" />
      if (evaluation.needsReview) return <AlertCircle className="h-4 w-4 text-yellow-500" />
      return <Clock className="h-4 w-4 text-blue-500" />
    }
    return <BarChart3 className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>{evaluation ? 'Avaliação Existente' : 'Nova Avaliação'}</span>
            {evaluation && (
              <Badge variant="outline" className={getScoreColor(evaluation.overallScore)}>
                <Star className="h-3 w-3 mr-1" />
                {evaluation.overallScore.toFixed(1)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {evaluation 
              ? 'Visualize os detalhes da avaliação desta consulta SQL.'
              : 'Avalie a qualidade da consulta SQL gerada e seus resultados.'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Critérios de avaliação */}
              {criteria.map((criterion) => (
                <div key={criterion.id} className="space-y-3 p-4 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">{criterion.name}</Label>
                    <p className="text-xs text-muted-foreground mt-1">{criterion.description}</p>
                  </div>

                  {/* Controle baseado no tipo */}
                  {criterion.type === 'boolean' && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={criteriaValues[criterion.id] as boolean}
                        onCheckedChange={(checked) => 
                          setCriteriaValues(prev => ({ ...prev, [criterion.id]: checked }))
                        }
                        disabled={!!evaluation}
                      />
                      <span className="text-sm">
                        {criteriaValues[criterion.id] ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  )}

                  {criterion.type === 'scale' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pontuação:</span>
                        <span className="text-sm font-medium">
                          {criteriaValues[criterion.id]}/{criterion.scaleMax || 5}
                        </span>
                      </div>
                      <Slider
                        value={[criteriaValues[criterion.id] as number]}
                        onValueChange={(value) => 
                          setCriteriaValues(prev => ({ ...prev, [criterion.id]: value[0] }))
                        }
                        min={criterion.scaleMin || 1}
                        max={criterion.scaleMax || 5}
                        step={1}
                        disabled={!!evaluation}
                        className="w-full"
                      />
                    </div>
                  )}

                  {criterion.type === 'text' && (
                    <Textarea
                      value={criteriaValues[criterion.id] as string}
                      onChange={(e) => 
                        setCriteriaValues(prev => ({ ...prev, [criterion.id]: e.target.value }))
                      }
                      placeholder="Digite sua avaliação..."
                      disabled={!!evaluation}
                      className="min-h-[80px]"
                    />
                  )}

                  {/* Comentário opcional */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Comentário (opcional)</Label>
                    <Textarea
                      value={criteriaComments[criterion.id] || ''}
                      onChange={(e) => 
                        setCriteriaComments(prev => ({ ...prev, [criterion.id]: e.target.value }))
                      }
                      placeholder="Adicione um comentário específico..."
                      disabled={!!evaluation}
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              ))}

              {/* Configurações gerais */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium">Avaliação Geral</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isCorrect}
                      onCheckedChange={setIsCorrect}
                      disabled={!!evaluation}
                    />
                    <Label className="text-sm">Resultado Correto</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={needsReview}
                      onCheckedChange={setNeedsReview}
                      disabled={!!evaluation}
                    />
                    <Label className="text-sm">Precisa Revisão</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isApproved}
                      onCheckedChange={setIsApproved}
                      disabled={!!evaluation}
                    />
                    <Label className="text-sm">Aprovado</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Comentário Geral</Label>
                  <Textarea
                    value={overallComment}
                    onChange={(e) => setOverallComment(e.target.value)}
                    placeholder="Comentário geral sobre a avaliação..."
                    disabled={!!evaluation}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Informações da avaliação existente */}
              {evaluation && (
                <div className="p-4 border rounded-lg bg-muted/10">
                  <div className="text-xs text-muted-foreground mb-2">
                    Avaliado por {evaluation.evaluatorName} em{' '}
                    {new Date(evaluation.timestamp).toLocaleString('pt-BR')}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-sm font-medium">Score: </span>
                      <span className={`text-sm font-bold ${getScoreColor(evaluation.overallScore)}`}>
                        {evaluation.overallScore.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">Correto:</span>
                      <Badge variant={evaluation.isCorrect ? "default" : "destructive"}>
                        {evaluation.isCorrect ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">Aprovado:</span>
                      <Badge variant={evaluation.isApproved ? "default" : "secondary"}>
                        {evaluation.isApproved ? "Sim" : "Não"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          {!evaluation && (
            <Button
              onClick={saveEvaluation}
              disabled={isSaving || isLoading}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
