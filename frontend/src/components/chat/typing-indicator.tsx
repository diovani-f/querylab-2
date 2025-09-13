'use client'

import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="max-w-[85%] sm:max-w-[70%] rounded-lg p-4 bg-gradient-to-r from-muted to-muted/80 border border-border/50">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="relative">
            <Bot className="h-4 w-4 text-primary" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium">QueryLab</span>
          <span className="text-xs text-muted-foreground bg-muted-foreground/10 px-2 py-1 rounded-full">
            🤖 Analisando...
          </span>
        </div>

        {/* Enhanced typing animation */}
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce opacity-80" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce opacity-80" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce opacity-80" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-muted-foreground">
            Interpretando sua pergunta e gerando SQL...
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
      <div className="max-w-[85%] sm:max-w-[70%] rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative">
            <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">QueryLab</span>
          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
            ⚡ Executando SQL
          </span>
        </div>

        {/* Enhanced Steps */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            <span className="text-green-700 dark:text-green-300 font-medium">✓ SQL gerado pela IA</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">🔄 Executando no banco de dados...</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400">📊 Preparando resultados</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400">💡 Gerando explicação inteligente</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  )
}
