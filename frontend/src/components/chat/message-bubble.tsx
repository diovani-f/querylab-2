'use client'

import ReactMarkdown from 'react-markdown'
import { Message } from "@/types"
import { cn } from "@/lib/utils"
import { User, Bot, AlertCircle, Info, CheckCircle, Star, Code, Eye, Play, Loader2, Check, X, Copy, MessageSquare, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState, memo, useCallback } from "react"
import { sanitizeError } from "@/lib/error-handler"
import { QueryResultsTable } from "./query-results-table"
import { EvaluationModal } from "../evaluation/evaluation-modal"
import { EvaluationTrigger } from "../evaluation/evaluation-trigger"
import { apiService } from '@/lib/api'
import { useAppStore } from '@/stores/app-store'
import { useUserSettings } from '@/hooks/use-user-settings'

interface MessageBubbleProps {
  message: Message
  sessionId?: string
}
export const MessageBubble = memo(function MessageBubble({ message, sessionId }: MessageBubbleProps) {
  const { addMessage } = useAppStore()
  const { settings } = useUserSettings()
  const [showTechnicalModal, setShowTechnicalModal] = useState(false)
  const [showExplainModal, setShowExplainModal] = useState(false)
  const [messageData, setMessageData] = useState(message);
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isCopied, setIsCopied] = useState(false)

  // Log para debug
  console.log('🔍 MessageBubble renderizando:', {
    messageId: messageData.id,
    tipo: messageData.tipo,
    hasSql: !!messageData.sql,
    hasSqlQuery: !!messageData.sqlQuery,
    hasQueryResult: !!messageData.queryResult,
    queryResultSuccess: messageData.queryResult?.success,
    hasRows: !!messageData.queryResult?.rows,
    rowsLength: messageData.queryResult?.rows?.length,
    rowCount: messageData.queryResult?.rowCount
  })

  const getIcon = useCallback((type: Message['tipo']) => {
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
  }, [])

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
        "max-w-[85%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] xl:max-w-[45%] rounded-lg p-3 sm:p-4 space-y-2 overflow-hidden break-words min-w-0 select-text",
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
          <div className="text-sm whitespace-pre-wrap break-words overflow-hidden select-text">
            <ReactMarkdown>{message.reverseTranslation || messageData.conteudo}</ReactMarkdown>
          </div>
        )}

        {/* SQL Query - só exibe no modo desenvolvedor */}
        {messageData.sqlQuery && settings.developerMode && (
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
              <div className="relative bg-black/10 rounded p-2 sm:p-3 font-mono text-xs overflow-auto flex-grow min-w-0 select-text" style={{ maxHeight: 300 }}>
                <pre className="whitespace-pre-wrap break-all select-text">{messageData.sqlQuery}</pre>
              </div>
              {/* Botão de executar só aparece no modo desenvolvedor */}
              {settings.developerMode && (
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
              )}
              {/* Indicador de execução automática */}
              {!settings.developerMode && messageData.queryResult && messageData.queryResult.success !== false && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                  <Zap className="h-3 w-3" />
                  <span>Executado automaticamente</span>
                </div>
              )}
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
              <p className="text-sm text-destructive">
                {sanitizeError(messageData.queryResult.error, 'query_execution').userMessage}
              </p>
            </div>
          </div>
        )}

        {/* Explanation */}
        {/* {messageData.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">💡 Explicação da Consulta</span>
            </div>
            <p className="text-sm text-blue-700 leading-relaxed">
              {messageData.explanation}
            </p>
          </div>
        )} */}
      </div>
      {/* Botões flutuantes abaixo do bubble-message */}
      {(() => {
        const shouldShowButtons = messageData.tipo === 'assistant' && (messageData.sqlQuery || messageData.queryResult || messageData.explanation);
        console.log('🔘 Debug botões flutuantes:', {
          messageId: messageData.id,
          tipo: messageData.tipo,
          hasSqlQuery: !!messageData.sqlQuery,
          hasQueryResult: !!messageData.queryResult,
          hasExplanation: !!messageData.explanation,
          queryResultSuccess: messageData.queryResult?.success,
          shouldShowButtons,
          messageData: messageData
        });
        return shouldShowButtons;
      })() && (
        <div
          className="flex flex-row gap-2 sm:gap-3 items-center mt-4"
          style={{ position: 'absolute', left: '4px', bottom: '0', transform: 'translateY(25px)', zIndex: 20 }}
        >
          <TooltipProvider>
            {/* Botão para explain detalhado - aparece sempre que há explanation */}
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
                  <TooltipContent>
                    {messageData.queryResult?.success === false ? 'Detalhes do Erro' : 'Explain Detalhado'}
                  </TooltipContent>
                </Tooltip>
                <DialogContent className="max-w-2xl w-full">
                  <DialogHeader>
                    <DialogTitle>
                      {messageData.queryResult?.success === false ? 'Detalhes do Erro' : 'Explain Detalhado'}
                    </DialogTitle>
                  </DialogHeader>
                  {/* Explain detalhado */}
                  {messageData.explanation && (
                    <div className="mt-4">
                      <div className="max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{messageData.explanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
            {/* Botão de detalhes técnicos - aparece sempre que há queryResult ou sqlQuery */}
            {(messageData.queryResult || messageData.sqlQuery) && (
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
                    <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto p-6">
                      <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-semibold">Detalhes Técnicos</DialogTitle>

                        {/* Informações da Query */}
                        <div className="space-y-4 mt-4">
                          {/* SQL Query */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                <span className="font-medium text-sm">Consulta SQL</span>
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
                            <div className="bg-muted/50 rounded-lg p-3 border">
                              <pre className="text-xs font-mono whitespace-pre-wrap break-all overflow-auto max-h-32 select-text">
                                {messageData.sqlQuery}
                              </pre>
                            </div>
                          </div>

                          {/* Métricas */}
                          <div className="flex flex-wrap items-center gap-3">
                            {messageData.queryResult?.executionTime && (
                              <Badge variant="secondary" className="gap-1">
                                <span>⏱️</span>
                                {messageData.queryResult.executionTime}ms
                              </Badge>
                            )}
                            {messageData.queryResult?.rowCount !== undefined && (
                              <Badge variant="outline" className="gap-1">
                                <span>📊</span>
                                {messageData.queryResult.rowCount} linha{messageData.queryResult.rowCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {messageData.queryResult?.success !== false && (
                              <Badge variant="default" className="gap-1 bg-green-600">
                                <span>✅</span>
                                Executado com sucesso
                              </Badge>
                            )}
                          </div>

                          {/* Análise dos Resultados */}
                          {messageData.reverseTranslation && (
                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">💡 Análise dos Resultados</span>
                              </div>
                              <div className="text-sm text-green-700 dark:text-green-300 leading-relaxed max-w-none">
                                <ReactMarkdown>{messageData.reverseTranslation}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Detalhes do Erro */}
                          {messageData.explanation && messageData.queryResult && messageData.queryResult.success === false && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm font-medium text-red-800 dark:text-red-200">🚨 Detalhes do Erro</span>
                              </div>
                              <div className="text-sm text-red-700 dark:text-red-300 leading-relaxed max-w-none">
                                <ReactMarkdown>{messageData.explanation}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogHeader>

                      {/* Conteúdo */}
                      <div>
                          {/* Resultados da Query */}
                          {messageData.queryResult && messageData.queryResult.success !== false && messageData.queryResult.rows && messageData.queryResult.rows.length > 0 && (
                            <div>
                              <div className="mb-4">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <span>📋</span>
                                  Resultados da Consulta
                                </h3>
                              </div>
                              <div className="border rounded-lg bg-background p-4">
                                <QueryResultsTable
                                  queryResult={messageData.queryResult}
                                  onExport={(format) => {
                                    console.log(`Exportando em formato: ${format}`)
                                    // TODO: Implementar exportação
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Estado vazio */}
                          {(!messageData.queryResult || (!messageData.queryResult.rows || messageData.queryResult.rows.length === 0)) && messageData.queryResult?.success !== false && (
                            <div className="flex items-center justify-center py-12">
                              <div className="text-center text-muted-foreground">
                                <div className="mb-3">
                                  <Info className="h-8 w-8 mx-auto" />
                                </div>
                                <p className="text-sm">Nenhum resultado para exibir</p>
                                <p className="text-xs mt-1">A consulta foi executada mas não retornou dados</p>
                              </div>
                            </div>
                          )}
                      </div>
                    </DialogContent>
              </Dialog>
            )}
            {/* Modal de Avaliação - para mensagens de assistente com SQL (incluindo erros) */}
            {messageData.tipo === 'assistant' && sessionId && (messageData.sqlQuery || messageData.queryResult) && (
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
})
