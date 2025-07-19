'use client'

import { Message } from "@/types"
import { cn } from "@/lib/utils"
import { User, Bot, AlertCircle, Info, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { QueryResultsTable } from "./query-results-table"
import { ChartContainer } from "../charts/chart-container"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showSQL, setShowSQL] = useState(false)
  const [showFullResults, setShowFullResults] = useState(false)
  const [showAdvancedView, setShowAdvancedView] = useState(false)

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
              <div className="text-xs font-medium">
                Resultado: {message.queryResult.rowCount} linhas em {message.queryResult.executionTime}ms
              </div>

              {message.queryResult.rows.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullResults(!showFullResults)}
                    className="text-xs"
                  >
                    <Table className="mr-1 h-3 w-3" />
                    {showFullResults ? 'Ocultar Tabela' : 'Ver Tabela Completa'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedView(!showAdvancedView)}
                    className="text-xs"
                  >
                    📊 {showAdvancedView ? 'Ocultar Gráficos' : 'Ver Gráficos'}
                  </Button>
                </div>
              )}
            </div>

            {message.queryResult.rows.length > 0 && (
              <>
                {showAdvancedView ? (
                  <div className="bg-background border rounded-lg p-4">
                    <ChartContainer
                      queryResult={message.queryResult}
                      title="Visualização de Dados"
                    />
                  </div>
                ) : showFullResults ? (
                  <div className="bg-background border rounded-lg p-4">
                    <QueryResultsTable queryResult={message.queryResult} />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b">
                          {message.queryResult.columns.map((col, idx) => (
                            <th key={idx} className="text-left p-2 font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.queryResult.rows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-b">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="p-2">
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {message.queryResult.rows.length > 5 && (
                      <div className="text-xs text-center py-2 opacity-70">
                        ... e mais {message.queryResult.rows.length - 5} linhas
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
