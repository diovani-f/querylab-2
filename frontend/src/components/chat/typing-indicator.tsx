'use client'

import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="max-w-[80%] rounded-lg p-4 bg-muted">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-2">
          <Bot className="h-4 w-4" />
          <span className="text-sm font-medium">QueryLab</span>
          <span className="text-xs opacity-70">digitando...</span>
        </div>

        {/* Typing animation */}
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            Processando sua consulta...
          </span>
        </div>
      </div>
    </div>
  )
}

// Componente para loading mais detalhado durante execução de SQL
export function SQLExecutionIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="max-w-[80%] rounded-lg p-4 bg-muted">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <Bot className="h-4 w-4" />
          <span className="text-sm font-medium">QueryLab</span>
          <span className="text-xs opacity-70">executando consulta...</span>
        </div>

        {/* Steps */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span>SQL gerado pela IA</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span>Executando no banco de dados...</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            <span>Gerando explicação dos resultados</span>
          </div>
        </div>
      </div>
    </div>
  )
}
