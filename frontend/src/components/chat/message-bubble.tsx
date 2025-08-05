'use client'

import { Message } from "@/types"
import { cn } from "@/lib/utils"
import { User, Bot, AlertCircle, Info, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { QueryResultsTable } from "./query-results-table"
import { ChartContainer } from "../charts/chart-container"
import { EvaluationModal } from "../evaluation/evaluation-modal"
import { EvaluationTrigger } from "../evaluation/evaluation-trigger"

interface MessageBubbleProps {
  message: Message
  sessionId?: string
}

export function MessageBubble({ message, sessionId }: MessageBubbleProps) {
  const [showSQL, setShowSQL] = useState(false)
  const [showResults, setShowResults] = useState(true) // Mostrar resultados por padrão

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

        {/* SQL Query (se houver) */}
        {message.sqlQuery && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSQL(!showSQL)}
              className="text-xs"
            >
              {showSQL ? 'Ocultar SQL' : 'Ver SQL Gerado'}
            </Button>

            {showSQL && (
              <div className="bg-black/10 rounded p-3 font-mono text-xs overflow-x-auto">
                <pre>{message.sqlQuery}</pre>
              </div>
            )}
          </div>
        )}

        {/* Resultado da Query (se houver) */}
        {message.queryResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {message.queryResult.rows.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResults(!showResults)}
                  className="text-xs"
                >
                  <Table className="mr-1 h-3 w-3" />
                  {showResults ? 'Ocultar Resultados' : 'Ver Resultados'}
                </Button>
              )}
            </div>

            {message.queryResult.rows.length > 0 && showResults && (
              <div className="bg-background border rounded-lg p-4">
                <ChartContainer
                  queryResult={message.queryResult}
                  title="Resultados da Consulta"
                />
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
              <EvaluationTrigger messageId={message.id} />
            </EvaluationModal>
          </div>
        )}
      </div>
    </div>
  )
}
