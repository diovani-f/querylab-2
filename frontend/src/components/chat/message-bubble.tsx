'use client'

import ReactMarkdown from 'react-markdown'
import { Message } from "@/types"
import { cn } from "@/lib/utils"
import { User, Bot, AlertCircle, Info, Table, CheckCircle, Star, Code, Eye, EyeOff, Play, Loader2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState } from "react"
import { ChartContainer } from "../charts/chart-container"
import { QueryResultsTable } from "./query-results-table"
import { EvaluationModal } from "../evaluation/evaluation-modal"
import { EvaluationTrigger } from "../evaluation/evaluation-trigger"
import { apiService } from '@/lib/api'

interface MessageBubbleProps {
  message: Message
  sessionId?: string
}
export function MessageBubble({ message, sessionId }: MessageBubbleProps) {
  const [showTechnicalModal, setShowTechnicalModal] = useState(false)
  const [showExplainModal, setShowExplainModal] = useState(false)
  const [messageData, setMessageData] = useState(message);
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const getIcon = (type: Message['tipo']) => {
    switch (type) {
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

  const getBubbleStyles = (type: Message['tipo']) => {
    switch (type) {
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

  const getContainerStyles = (type: Message['tipo']) => {
    return type === 'user' ? "justify-end" : "justify-start"
  }

  const handleExecuteQuery = async () => {
    if (!sessionId) return

    setIsExecuting(true)
    setExecutionStatus('idle')

    try {
      const data = await apiService.executeQuery({sessionId: sessionId, messageId: message.id})
      console.log("🚀 ~ handleExecuteQuery ~ data:", data)
      setMessageData(data?.data || data)
      setExecutionStatus('success')

      // Limpar status de sucesso após 3 segundos
      setTimeout(() => setExecutionStatus('idle'), 3000)
    } catch (error) {
      console.error('Erro ao executar query:', error)
      setExecutionStatus('error')

      // Limpar status de erro após 5 segundos
      setTimeout(() => setExecutionStatus('idle'), 5000)
    } finally {
      setIsExecuting(false)
    }
  }
  return (
    <div className={cn("flex", getContainerStyles(messageData.tipo), "relative")}> {/* relative para botões absolutos */}
      <div className={cn(
        "max-w-[80%] rounded-lg p-4 space-y-2",
        getBubbleStyles(messageData.tipo)
      )}>
        {/* Header da mensagem */}
        <div className="flex items-center space-x-2">
          {getIcon(messageData.tipo)}
          <span className="text-sm font-medium">
            {messageData.tipo === 'user' ? 'Você' :
             messageData.tipo === 'assistant' ? 'QueryLab' :
             messageData.tipo === 'error' ? 'Erro' : 'Sistema'}
          </span>

          {/* Indicador de avaliação para mensagens de assistente */}
          {messageData.tipo === 'assistant' && messageData.evaluation && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              {messageData.evaluation.overallScore.toFixed(1)}
              {messageData.evaluation.isApproved && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
            </Badge>
          )}

          <span className="text-xs opacity-70">
            {new Date(messageData.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Conteúdo da mensagem */}
        {messageData.conteudo && (
          <div className="text-sm whitespace-pre-wrap">
            <ReactMarkdown>{messageData.conteudo}</ReactMarkdown>
          </div>
        )}

        {/* SQL Query */}
        {messageData.sqlQuery && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span className="text-sm font-medium">SQL Gerado</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="relative bg-black/10 rounded p-3 font-mono text-xs overflow-auto max-w-full flex-grow" style={{ maxHeight: 300 }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{messageData.sqlQuery}</pre>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={executionStatus === 'success' ? 'default' : executionStatus === 'error' ? 'destructive' : 'default'}
                      size="icon"
                      className="rounded-full shadow-lg flex-shrink-0"
                      onClick={handleExecuteQuery}
                      disabled={isExecuting}
                    >
                      {isExecuting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : executionStatus === 'success' ? (
                        <Check className="h-5 w-5" />
                      ) : executionStatus === 'error' ? (
                        <X className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isExecuting ? 'Executando...' :
                     executionStatus === 'success' ? 'Executado com sucesso!' :
                     executionStatus === 'error' ? 'Erro na execução' :
                     'Executar SQL'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Resultados da Query */}
        {messageData.queryResult && messageData.queryResult.success !== false && messageData.queryResult.rows && messageData.queryResult.rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              <span className="text-sm font-medium">Resultados</span>
              <Badge variant="outline" className="text-xs">
                {messageData.queryResult.rowCount || 0} linha{(messageData.queryResult.rowCount || 0) !== 1 ? 's' : ''}
              </Badge>
              {messageData.queryResult.executionTime && (
                <Badge variant="secondary" className="text-xs">
                  {messageData.queryResult.executionTime}ms
                </Badge>
              )}
            </div>

            <div className="bg-background border rounded-lg p-4 overflow-auto" style={{ maxHeight: 400 }}>
              {messageData.queryResult.rows && messageData.queryResult.rows.length > 0 ? (
                <div className="space-y-3">
                  {/* Tabela simples para resultados pequenos */}
                  {messageData.queryResult.rows.length <= 10 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {messageData.queryResult.columns?.map((column, index) => (
                              <th key={index} className="text-left p-2 font-medium">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {messageData.queryResult.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-gray-100">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-2 font-mono text-xs">
                                  {cell !== null && cell !== undefined ? String(cell) : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Para resultados maiores, mostrar apenas as primeiras linhas */
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Mostrando as primeiras 5 linhas de {messageData.queryResult.rowCount} resultados.
                        Clique no botão "Detalhes Técnicos" para ver todos os dados.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {messageData.queryResult.columns?.map((column, index) => (
                                <th key={index} className="text-left p-2 font-medium">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {messageData.queryResult.rows.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-b border-gray-100">
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="p-2 font-mono text-xs">
                                    {cell !== null && cell !== undefined ? String(cell) : '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botões flutuantes abaixo do bubble-message */}
      {messageData.tipo === 'assistant' && (
        <div
          className="flex flex-row gap-2 items-center"
          style={{ position: 'absolute', left: '5px', bottom: '0', transform: 'translateY(25px)', marginTop: 12, zIndex: 20 }}
        >
          <TooltipProvider>
            {/* Botão para explain detalhado */}
            {messageData.explanation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Dialog open={showExplainModal} onOpenChange={setShowExplainModal}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full shadow-lg"
                        onClick={() => setShowExplainModal(true)}
                      >
                        <Info className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl w-full">
                      <DialogHeader>
                        <DialogTitle>Explain Detalhado</DialogTitle>
                      </DialogHeader>
                      {/* Explain detalhado */}
                      {messageData.explanation && (
                        <DialogDescription className="mt-4">
                          <ReactMarkdown>{messageData.explanation}</ReactMarkdown>
                        </DialogDescription>
                      )}
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent>Explain Detalhado</TooltipContent>
              </Tooltip>
            )}
            {/* Botão de detalhes técnicos */}
            {messageData.queryResult && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Dialog open={showTechnicalModal} onOpenChange={setShowTechnicalModal}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full shadow-lg"
                        onClick={() => setShowTechnicalModal(true)}
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl w-full max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Detalhes Técnicos</DialogTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>SQL: {messageData.sqlQuery}</span>
                          {messageData.queryResult?.executionTime && (
                            <Badge variant="secondary">
                              {messageData.queryResult.executionTime}ms
                            </Badge>
                          )}
                          {messageData.queryResult?.rowCount && (
                            <Badge variant="outline">
                              {messageData.queryResult.rowCount} linha{messageData.queryResult.rowCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </DialogHeader>
                      {/* Resultados da Query */}
                      {messageData.queryResult && messageData.queryResult.success !== false && messageData.queryResult.rows && messageData.queryResult.rows.length > 0 && (
                        <div className="mt-4 overflow-hidden">
                          <QueryResultsTable
                            queryResult={messageData.queryResult}
                            onExport={(format) => {
                              console.log(`Exportando em formato: ${format}`)
                              // TODO: Implementar exportação
                            }}
                          />
                        </div>
                      )}
                      {messageData.queryResult && messageData.queryResult.success === false && (
                        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm text-destructive">
                            Erro na execução: {messageData.queryResult.error}
                          </p>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent>Detalhes Técnicos</TooltipContent>
              </Tooltip>
            )}
            {/* Modal de Avaliação - apenas para mensagens de assistente com SQL */}
            {messageData.tipo === 'assistant' && sessionId && messageData.sqlQuery && (
              <div>
                <EvaluationModal
                  message={message}
                  sessionId={sessionId}
                  onEvaluationSaved={(evaluation) => {
                    console.log('Avaliação salva:', evaluation)
                  }}
                >
                  <EvaluationTrigger
                    messageId={messageData.id}
                    evaluation={messageData.evaluation}
                  />
                </EvaluationModal>
              </div>
            )}
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
