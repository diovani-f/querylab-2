'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/stores/app-store"
import { Send, MessageSquare } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator, SQLExecutionIndicator } from "./typing-indicator"
import { websocketService } from "@/lib/websocket"

export function ChatInterface() {
  const [inputValue, setInputValue] = useState("")
  const [isHydrated, setIsHydrated] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    isProcessing,
    currentSession,
    addMessage,
    createNewSession,
    sendMessage,
    initializeWebSocket,
    disconnectWebSocket,
  } = useAppStore()

  // Função para scroll suave para o final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    })
  }

  // Garantir hidratação no cliente
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Scroll para o final quando mensagens mudarem
  useEffect(() => {
    if (currentSession?.messages && currentSession.messages.length > 0) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(scrollToBottom, 100)
    }
  }, [currentSession?.messages])

  // Scroll para o final quando entrar em loading (nova mensagem sendo processada)
  useEffect(() => {
    if (isProcessing) {
      setTimeout(scrollToBottom, 100)
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
      await sendMessage(userMessage)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      addMessage({
        type: 'error',
        content: 'Erro ao processar sua consulta. Tente novamente.'
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
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
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Bem-vindo ao QueryLab</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Faça consultas em linguagem natural e converta-as automaticamente para SQL.
            Comece uma nova conversa para começar.
          </p>
          <Button onClick={() => createNewSession()}>
            Iniciar Nova Sessão
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {(currentSession?.messages || []).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Digite sua primeira consulta abaixo para começar
              </p>
            </div>
          ) : (
            (currentSession?.messages || []).map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                sessionId={currentSession?.id}
              />
            ))
          )}

          {isProcessing && (
            <TypingIndicator />
          )}

          {/* Elemento invisível para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input de Mensagem */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua consulta em linguagem natural..."
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  )
}
