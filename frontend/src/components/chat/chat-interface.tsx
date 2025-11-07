'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/stores/app-store"
import { Send, MessageSquare, ArrowLeft } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator, SQLExecutionIndicator } from "./typing-indicator"
import { MessageSearch } from "./message-search"
import { ParallelSQLDialog } from "./parallel-sql-dialog"
import { ParallelResultsPreview } from "./parallel-results-preview"
import { websocketService } from "@/lib/websocket"
import { PulseLoader } from "react-spinners"
import { useUserSettings } from "@/hooks/use-user-settings"
import { useErrorHandler } from "@/lib/error-handler"

export function ChatInterface() {
  const [inputValue, setInputValue] = useState("")
  const [isHydrated, setIsHydrated] = useState(false)
  const [showParallelResults, setShowParallelResults] = useState(false)
  const [parallelResults, setParallelResults] = useState<any[]>([])
  const [isParallelLoading, setIsParallelLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { settings } = useUserSettings()
  const { handleError } = useErrorHandler()

  const {
    isProcessing,
    currentSession,
    setCurrentSession,
    addMessage,
    createNewSession,
    sendMessage,
    initializeWebSocket,
    disconnectWebSocket,
    isLoadingMessages,
    isCreatingSession
  } = useAppStore()

  // Função para scroll suave para o final
  const scrollToBottom = (force = false) => {
    if (!messagesEndRef.current) return

    // Se force=true, sempre fazer scroll
    if (force) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
      return
    }

    // Verificar se o usuário está próximo do final antes de fazer scroll automático
    const scrollArea = scrollAreaRef.current
    if (scrollArea) {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

      if (isNearBottom) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        })
      }
    }
  }

  // Garantir hidratação no cliente
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Scroll para o final quando mensagens mudarem
  useEffect(() => {
    if (currentSession?.mensagens && currentSession.mensagens.length > 0) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(scrollToBottom, 100)
    }
  }, [currentSession?.mensagens])

  // Scroll para o final quando entrar em loading (nova mensagem sendo processada)
  useEffect(() => {
    if (isProcessing) {
      setTimeout(() => scrollToBottom(true), 100) // Forçar scroll quando processando
    }
  }, [isProcessing])

  // Initialize WebSocket on component mount
  useEffect(() => {
    initializeWebSocket()

    return () => {
      disconnectWebSocket()
    }
  }, [initializeWebSocket, disconnectWebSocket])

  // Join session when current session changes
  useEffect(() => {
    if (currentSession) {
      websocketService.joinSession(currentSession.id)
    }
  }, [currentSession])

  // Listener para geração paralela de SQL
  useEffect(() => {
    const handleParallelGenerating = (data: { status: string, results?: any[] }) => {
      console.log('🚀 Evento SQL Paralelo recebido:', data)

      if (data.results) {
        // Resultados recebidos - mostrar preview
        setParallelResults(data.results)
        setShowParallelResults(true)
        setIsParallelLoading(false)
      } else {
        // Iniciando geração - mostrar loading
        setShowParallelResults(true)
        setIsParallelLoading(true)
        setParallelResults([])
      }
    }

    websocketService.onSQLParallelGenerating(handleParallelGenerating)

    return () => {
      websocketService.removeListener('sql-parallel-generating', handleParallelGenerating)
    }
  }, [])

  // Limpar resultados paralelos ao trocar de sessão
  useEffect(() => {
    setShowParallelResults(false)
    setParallelResults([])
    setIsParallelLoading(false)
  }, [currentSession?.id])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // Se não há sessão atual, criar uma nova
    if (!currentSession) {
      await createNewSession()
      return
    }

    const userMessage = inputValue.trim()
    setInputValue("")

    try {
      // SEMPRE usar WebSocket - o backend decide se usa modo paralelo ou não
      // baseado na configuração useParallelMode enviada
      await sendMessage(userMessage)

      console.log(settings.useParallelMode
        ? '🚀 Mensagem enviada - modo paralelo ativado'
        : '📤 Mensagem enviada - modo normal')
    } catch (error) {
      console.error('❌ Erro no handleSendMessage:', error)
      const userFriendlyMessage = handleError(error, 'message_send')
      addMessage({
        tipo: 'error',
        conteudo: userFriendlyMessage
      })
    }
  }

  const handleSelectParallelResult = async (result: any) => {
    console.log('✅ Resultado selecionado:', result.provider)

    // Ocultar preview
    setShowParallelResults(false)

    // Converter data (array de objetos) para rows (array de arrays)
    const columns = result.columns || []
    const rows = result.data && result.data.length > 0
      ? result.data.map((obj: any) => columns.map((col: string) => obj[col]))
      : []

    // Adicionar mensagem com o resultado selecionado
    addMessage({
      tipo: 'assistant' as const,
      conteudo: result.explanation || `SQL gerado pelo ${result.provider}`,
      sqlQuery: result.sql,
      explanation: result.explanation,
      queryResult: {
        success: true,
        rows,
        columns,
        rowCount: result.rowCount || 0,
        executionTime: result.executionTime || 0
      }
    })
  }

  const handleCardClick = async (question: string) => {
    // Criar nova sessão se não existir
    if (!currentSession) {
      await createNewSession()
    }

    // Definir a pergunta no input e enviar
    setInputValue(question)

    // Aguardar um pouco para garantir que a sessão foi criada
    setTimeout(async () => {
      try {
        await sendMessage(question)
        setInputValue("") // Limpar input após enviar
      } catch (error) {
        addMessage({
          tipo: 'error',
          conteudo: 'Erro ao processar sua consulta. Tente novamente.'
        })
      }
    }, 100)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    // Atalho Ctrl+K para limpar input
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setInputValue("")
    }
    // Atalho Ctrl+/ para focar no input
    if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const textarea = e.target as HTMLTextAreaElement
      textarea.focus()
    }
  }

  // Função para ajustar altura do textarea automaticamente
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = Math.min(element.scrollHeight, 200) + 'px'
  }

  // Não renderizar até estar hidratado
  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!currentSession) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <div className="mb-6">
            <MessageSquare className="h-20 w-20 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Bem-vindo ao QueryLab
            </h3>
            <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
              Transforme suas perguntas em consultas SQL inteligentes.
              Nossa IA especializada em dados educacionais do INEP está pronta para ajudar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-sm">
            <div
              className="p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors border hover:border-primary/20"
              onClick={() => handleCardClick("Quantos cursos de graduação existem por região do Brasil?")}
            >
              <h4 className="font-semibold mb-2">🎓 Dados Educacionais</h4>
              <p className="text-muted-foreground">Explore informações sobre cursos, instituições e ensino superior</p>
            </div>
            <div
              className="p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors border hover:border-primary/20"
              onClick={() => handleCardClick("Como funciona a geração automática de SQL a partir de linguagem natural?")}
            >
              <h4 className="font-semibold mb-2">🤖 IA Inteligente</h4>
              <p className="text-muted-foreground">Converta linguagem natural em SQL otimizado automaticamente</p>
            </div>
            <div
              className="p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors border hover:border-primary/20"
              onClick={() => handleCardClick("Mostre-me as 10 instituições com mais cursos de graduação")}
            >
              <h4 className="font-semibold mb-2">📊 Resultados Visuais</h4>
              <p className="text-muted-foreground">Visualize dados em tabelas interativas e gráficos</p>
            </div>
          </div>

          <Button
            onClick={() => createNewSession()}
            disabled={isCreatingSession}
            size="lg"
            className="min-w-[200px] h-12"
          >
            {isCreatingSession ? (
              <div className="flex items-center gap-2">
                <PulseLoader color="#ffffff" size={6} />
                <span>Criando sessão...</span>
              </div>
            ) : (
              'Começar Nova Consulta'
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Dica: Experimente perguntas como "quantos cursos de pedagogia existem?" ou "mostre universidades do Rio de Janeiro"
          </p>
        </div>
      </div>
    )
  }

  const handleMessageSelect = (messageId: string) => {
    // Scroll para a mensagem selecionada
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Destacar temporariamente a mensagem
      messageElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50')
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50')
      }, 2000)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header da área de mensagens com busca */}
      {currentSession && currentSession.mensagens.length > 0 && (
        <div className="border-b p-2 sm:p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentSession(null)
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentSession.mensagens.length} {currentSession.mensagens.length !== 1 ? 'mensagens' : 'mensagem'}
              </span>
            </div>
            <MessageSearch
              messages={currentSession.mensagens}
              onMessageSelect={handleMessageSelect}
            />
          </div>
        </div>
      )}

      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 p-2 sm:p-4" ref={scrollAreaRef}>
        <div className="space-y-6 sm:space-y-8 w-full">
          {isLoadingMessages ? (
            <div className="text-center py-8">
              <SQLExecutionIndicator />
              <p className="text-muted-foreground mt-4">
                Carregando mensagens...
              </p>
            </div>
          ) : (currentSession?.mensagens || []).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Digite sua primeira consulta abaixo para começar
              </p>
            </div>
          ) : (
            (currentSession?.mensagens || []).map((message) => (
              <div key={message.id} id={`message-${message.id}`} className="transition-all duration-300">
                <MessageBubble
                  message={message}
                  sessionId={currentSession?.id}
                />
              </div>
            ))
          )}

          {isProcessing && !showParallelResults && (
            <TypingIndicator />
          )}

          {/* Preview de Resultados Paralelos */}
          {showParallelResults && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isParallelLoading && parallelResults.length === 0 ? (
                <div className="text-center py-8">
                  <SQLExecutionIndicator />
                  <p className="text-muted-foreground mt-4">
                    Gerando SQL com 3 modelos simultaneamente...
                  </p>
                </div>
              ) : (
                <ParallelResultsPreview
                  results={parallelResults}
                  onSelectResult={handleSelectParallelResult}
                  onClose={() => {
                    setShowParallelResults(false)
                    setParallelResults([])
                    setIsParallelLoading(false)
                  }}
                />
              )}
            </div>
          )}

          {/* Elemento invisível para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input de Mensagem */}
      <div className="border-t p-2 sm:p-4">
        <div className="w-full space-y-2">
          {/* Botão de Modo Paralelo - DESATIVADO TEMPORARIAMENTE (experimental) */}
          {false && inputValue.trim() && !isProcessing && !isCreatingSession && (
            <div className="flex justify-end">
              <ParallelSQLDialog
                question={inputValue}
                onSelectSQL={(sql, provider) => {
                  console.log(`SQL selecionado do ${provider}:`, sql)
                  // Aqui você pode adicionar lógica para usar o SQL selecionado
                }}
              />
            </div>
          )}

          <div className="flex items-end space-x-2">
            <Textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                adjustTextareaHeight(e.target)
              }}
              onKeyDown={handleKeyPress}
              placeholder={
                isCreatingSession
                  ? "Criando sessão..."
                  : isProcessing
                    ? "Aguarde a resposta..."
                    : "Digite sua consulta em linguagem natural... (Enter para enviar, Ctrl+K para limpar)"
              }
              className="flex-1 min-h-[44px] max-h-[200px] resize-none"
              disabled={isProcessing || isCreatingSession}
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || isCreatingSession}
              size="icon"
              className="flex-shrink-0"
            >
              {isCreatingSession ? (
                <PulseLoader color="#ffffff" size={4} />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Pressione Enter para enviar, Shift+Enter para nova linha
            </p>
            {settings.developerMode ? (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <MessageSquare className="h-3 w-3" />
                <span>Modo Desenvolvedor</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Send className="h-3 w-3" />
                <span>Modo Automático</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
