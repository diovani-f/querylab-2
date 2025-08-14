'use client'

import { Message } from "@/types"
import { cn } from "@/lib/utils"
import { User, Bot, AlertCircle, Info, Table, CheckCircle, Star, Code, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { ChartContainer } from "../charts/chart-container"
import { EvaluationModal } from "../evaluation/evaluation-modal"
import { EvaluationTrigger } from "../evaluation/evaluation-trigger"

interface MessageBubbleProps {
  message: Message
  sessionId?: string
}

export function MessageBubble({ message, sessionId }: MessageBubbleProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  const getIcon = () => {
    switch (message.type) {
      case 'user':
        return <User className="h-4 w-4" />
      case 'assistant':
        return <Bot className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'system':
        return <Info className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getBubbleStyles = () => {
    switch (message.type) {
      case 'user':
        return "bg-primary text-primary-foreground ml-auto"
      case 'assistant':
        return "bg-muted"
      case 'error':
        return "bg-destructive/10 border-destructive/20 text-destructive"
      case 'system':
        return "bg-blue-50 border-blue-200 text-blue-800"
      default:
        return "bg-muted"
    }
  }

  const getContainerStyles = () => {
    return message.type === 'user' ? "justify-end" : "justify-start"
  }

  return (
    <div className={cn("flex", getContainerStyles())}>
      <div className={cn(
        "max-w-[80%] rounded-lg p-4 space-y-2",
        getBubbleStyles()
      )}>
        {/* Header da mensagem */}
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="text-sm font-medium">
            {message.type === 'user' ? 'Você' :
             message.type === 'assistant' ? 'QueryLab' :
             message.type === 'error' ? 'Erro' : 'Sistema'}
          </span>

          {/* Indicador de avaliação para mensagens de assistente */}
          {message.type === 'assistant' && message.evaluation && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              {message.evaluation.overallScore.toFixed(1)}
              {message.evaluation.isApproved && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
            </Badge>
          )}

          <span className="text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Conteúdo da mensagem */}
        <div className="text-sm whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Botões de ação para mensagens com dados técnicos */}
        {message.type === 'assistant' && message.hasExplanation && (message.sqlQuery || message.queryResult) && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs"
            >
              {showTechnicalDetails ? (
                <>
                  <EyeOff className="mr-1 h-3 w-3" />
                  Ocultar Detalhes Técnicos
                </>
              ) : (
                <>
                  <Eye className="mr-1 h-3 w-3" />
                  Ver Detalhes Técnicos
                </>
              )}
            </Button>
          </div>
        )}

        {/* Detalhes técnicos (SQL + Resultados) */}
        {showTechnicalDetails && (
          <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg border">
            {/* SQL Query */}
            {message.sqlQuery && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span className="text-sm font-medium">SQL Gerado</span>
                </div>

                <div className="bg-black/10 rounded p-3 font-mono text-xs overflow-x-auto">
                  <pre>{message.sqlQuery}</pre>
                </div>
              </div>
            )}

            {/* Resultados da Query */}
            {message.queryResult && message.queryResult.rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Resultados
                  </span>
                </div>

                <div className="bg-background border rounded-lg p-4">
                  <ChartContainer
                    queryResult={message.queryResult}
                    title="Dados da Consulta"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal de Avaliação - apenas para mensagens de assistente com SQL */}
        {message.type === 'assistant' && sessionId && message.sqlQuery && (
          <div className="mt-3 pt-3 border-t">
            <EvaluationModal
              message={message}
              sessionId={sessionId}
              onEvaluationSaved={(evaluation) => {
                console.log('Avaliação salva:', evaluation)
              }}
            >
              <EvaluationTrigger
                messageId={message.id}
                evaluation={message.evaluation}
              />
            </EvaluationModal>
          </div>
        )}
      </div>
    </div>
  )
}
