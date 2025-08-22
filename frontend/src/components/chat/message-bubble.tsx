'use client'

import ReactMarkdown from 'react-markdown'
import { Message } from "@/types"
import { cn } from "@/lib/utils"
import { User, Bot, AlertCircle, Info, Table, CheckCircle, Star, Code, Eye, EyeOff } from "lucide-react"
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
import { EvaluationModal } from "../evaluation/evaluation-modal"
import { EvaluationTrigger } from "../evaluation/evaluation-trigger"

interface MessageBubbleProps {
  message: Message
  sessionId?: string
}
export function MessageBubble({ message, sessionId }: MessageBubbleProps) {
  const [showTechnicalModal, setShowTechnicalModal] = useState(false)
  const [showExplainModal, setShowExplainModal] = useState(false)

  const getIcon = (type: Message['type']) => {
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

  const getBubbleStyles = (type: Message['type']) => {
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

  const getContainerStyles = (type: Message['type']) => {
    return type === 'user' ? "justify-end" : "justify-start"
  }

  return (
    <div className={cn("flex", getContainerStyles(message.type), "relative")}> {/* relative para botões absolutos */}
      <div className={cn(
        "max-w-[80%] rounded-lg p-4 space-y-2",
        getBubbleStyles(message.type)
      )}>
        {/* Header da mensagem */}
        <div className="flex items-center space-x-2">
          {getIcon(message.type)}
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
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>

      {/* Botões flutuantes abaixo do bubble-message */}
      {message.type === 'assistant' && (
        <div
          className="flex flex-row gap-2 items-center"
          style={{ position: 'absolute', left: '5px', bottom: '0', transform: 'translateY(25px)', marginTop: 12, zIndex: 20 }}
        >
          <TooltipProvider>
            {/* Botão de detalhes técnicos */}
            {(message.sqlQuery || message.queryResult) && (
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
                    <DialogContent className="max-w-2xl w-full">
                      <DialogHeader>
                        <DialogTitle>Detalhes Técnicos</DialogTitle>
                      </DialogHeader>
                      {/* SQL Query */}
                      {message.sqlQuery && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            <span className="text-sm font-medium">SQL Gerado</span>
                          </div>
                          <div className="bg-black/10 rounded p-3 font-mono text-xs overflow-auto max-w-full" style={{ maxHeight: 300 }}>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{message.sqlQuery}</pre>
                          </div>
                        </div>
                      )}
                      {/* Resultados da Query */}
                      {message.queryResult && message.queryResult.rows.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            <span className="text-sm font-medium">Resultados</span>
                          </div>
                          <div className="bg-background border rounded-lg p-4 overflow-auto" style={{ maxHeight: 300 }}>
                            <ChartContainer
                              queryResult={message.queryResult}
                              title="Dados da Consulta"
                            />
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent>Detalhes Técnicos</TooltipContent>
              </Tooltip>
            )}
            {/* Botão para explain detalhado */}
            {message.hasExplanation && message.explanation && (
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
                      {message.hasExplanation && (
                        <div className="mt-4">
                          <ReactMarkdown>{message.explanation}</ReactMarkdown>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent>Explain Detalhado</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}

      {/* Explain inicial sucinto abaixo do bubble-message */}
      {message.type === 'assistant' && message.reverseTranslation && (
        <div className="mt-2 p-2 bg-muted/30 rounded shadow text-xs">
          <div className="mt-2">
            <span className="font-semibold">Tradução reversa:</span>
            <span className="ml-1">{message.reverseTranslation}</span>
          </div>
        </div>
      )}
    </div>
  )
}
