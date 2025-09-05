'use client'

import ReactMarkdown from 'react-markdown'
import { Message } from "@/types"
import { cn } from "@/lib/utils"
import { User, Bot, AlertCircle, Info, Table, CheckCircle, Star, Code, Eye, EyeOff, Play, Loader2, Check, X, Copy, MessageSquare } from "lucide-react"
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
import { useAppStore } from '@/stores/app-store'

interface MessageBubbleProps {
  message: Message
  sessionId?: string
}
export function MessageBubble({ message, sessionId }: MessageBubbleProps) {
  const { addMessage } = useAppStore()
  const [showTechnicalModal, setShowTechnicalModal] = useState(false)
  const [showExplainModal, setShowExplainModal] = useState(false)
  const [messageData, setMessageData] = useState(message);
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isCopied, setIsCopied] = useState(false)

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

    console.log('🔍 Executando query para mensagem:', {
      messageId: message.id,
      sessionId: sessionId,
      hasSqlQuery: !!message.sqlQuery
    })

    try {
      const data = await apiService.executeQuery({sessionId: sessionId, messageId: message.id})
      console.log("🚀 ~ handleExecuteQuery ~ data:", data)
      setMessageData(data?.data || data)
      setExecutionStatus('success')

      // Limpar status de sucesso após 3 segundos
      setTimeout(() => setExecutionStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Erro ao executar query:', error)
      setExecutionStatus('error')

      // Adicionar mensagem de erro na conversa automaticamente
      const errorMessage = error?.message || 'Erro desconhecido ao executar a consulta'
      addMessage({
        tipo: 'error',
        conteudo: `❌ **Erro na execução da consulta:**\n\n${errorMessage}`
      })

      // Limpar status de erro após 5 segundos
      setTimeout(() => setExecutionStatus('idle'), 5000)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleCopySQL = async () => {
    if (!messageData.sqlQuery) return

    try {
      await navigator.clipboard.writeText(messageData.sqlQuery)
      setIsCopied(true)

      // Resetar o estado após 2 segundos
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar SQL:', error)
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea')
      textArea.value = messageData.sqlQuery
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)

      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }
  return (
    <div className={cn("flex", getContainerStyles(messageData.tipo), "relative w-full")}> {/* relative para botões absolutos */}
      <div className={cn(
        "max-w-[85%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] xl:max-w-[45%] rounded-lg p-3 sm:p-4 space-y-2 overflow-hidden break-words min-w-0",
        getBubbleStyles(messageData.tipo)
      )}>
        {/* Header da mensagem */}
        <div className="flex items-center space-x-2 flex-wrap gap-1">
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

          <span className="text-xs opacity-70 ml-auto">
            {new Date(messageData.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Conteúdo da mensagem */}
        {messageData.conteudo && (
          <div className="text-sm whitespace-pre-wrap break-words overflow-hidden">
            <ReactMarkdown>{messageData.conteudo}</ReactMarkdown>
          </div>
        )}

        {/* SQL Query */}
        {messageData.sqlQuery && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span className="text-sm font-medium">SQL Gerado</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={handleCopySQL}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isCopied ? 'SQL copiado para a área de transferência!' : 'Copiar SQL'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-start gap-2 sm:gap-4 w-full">
              <div className="relative bg-black/10 rounded p-2 sm:p-3 font-mono text-xs overflow-auto flex-grow min-w-0" style={{ maxHeight: 300 }}>
                <pre className="whitespace-pre-wrap break-all">{messageData.sqlQuery}</pre>
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

        {/* Erro na execução da Query */}
        {messageData.queryResult && messageData.queryResult.success === false && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Erro na Execução</span>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-mono">
                {messageData.queryResult.error}
              </p>
            </div>
          </div>
        )}

        {/* Reverse Translation */}
        {messageData.reverseTranslation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Resumo da Execução</span>
            </div>
            <p className="text-sm text-blue-700 leading-relaxed">
              {messageData.reverseTranslation}
            </p>
          </div>
        )}
      </div>

      {/* Botões flutuantes abaixo do bubble-message */}
      {messageData.tipo === 'assistant' && (
        <div
          className="flex flex-row gap-2 sm:gap-3 items-center mt-4"
          style={{ position: 'absolute', left: '4px', bottom: '0', transform: 'translateY(25px)', zIndex: 20 }}
        >
          <TooltipProvider>
            {/* Botão para explain detalhado */}
            {messageData.explanation && (
              <Dialog open={showExplainModal} onOpenChange={setShowExplainModal}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full shadow-lg bg-background border-2 hover:bg-accent hover:scale-105 transition-all duration-200"
                        onClick={() => setShowExplainModal(true)}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Explain Detalhado</TooltipContent>
                </Tooltip>
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
            )}
            {/* Botão de detalhes técnicos */}
            {messageData.queryResult && (
              <Dialog open={showTechnicalModal} onOpenChange={setShowTechnicalModal}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full shadow-lg bg-background border-2 hover:bg-accent hover:scale-105 transition-all duration-200"
                        onClick={() => setShowTechnicalModal(true)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Detalhes Técnicos</TooltipContent>
                </Tooltip>
                    <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] flex flex-col">
                      <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Detalhes Técnicos</DialogTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">SQL:</span>
                            <code className="bg-muted px-2 py-1 rounded text-xs max-w-md truncate">
                              {messageData.sqlQuery}
                            </code>
                          </div>
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

                        {/* Reverse Translation no modal */}
                        {messageData.reverseTranslation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">Resumo da Execução</span>
                            </div>
                            <p className="text-sm text-blue-700 leading-relaxed">
                              {messageData.reverseTranslation}
                            </p>
                          </div>
                        )}
                      </DialogHeader>

                      {/* Conteúdo scrollável */}
                      <div className="flex-1 overflow-hidden">
                        {/* Resultados da Query */}
                        {messageData.queryResult && messageData.queryResult.success !== false && messageData.queryResult.rows && messageData.queryResult.rows.length > 0 && (
                          <div className="h-full overflow-auto">
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
                          <div className="p-4">
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <p className="text-sm text-destructive">
                                Erro na execução: {messageData.queryResult.error}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
              </Dialog>
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
                    evaluation={message.evaluation || messageData.evaluation}
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
