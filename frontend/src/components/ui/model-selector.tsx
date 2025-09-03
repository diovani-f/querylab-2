'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppStore } from "@/stores/app-store"
import { ChevronDown, Bot, Zap, Brain, Code } from "lucide-react"
import { LLMModel, LLMProvider } from "@/types"

const providerIcons: Record<LLMProvider, React.ReactNode> = {
  groq: <Zap className="h-4 w-4" />,
  openai: <Brain className="h-4 w-4" />,
  anthropic: <Bot className="h-4 w-4" />,
  local: <Bot className="h-4 w-4" />,
  replicate: <Code className="h-4 w-4" />
}

const providerColors: Record<LLMProvider, string> = {
  groq: "text-orange-500",
  openai: "text-green-500",
  anthropic: "text-purple-500",
  local: "text-blue-500",
  replicate: "text-indigo-500"
}

export function ModelSelector() {
  const { availableModels, selectedModel, setSelectedModel } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)

  const handleModelSelect = (model: LLMModel) => {
    setSelectedModel(model)
    setIsOpen(false)
  }

  if (!selectedModel) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Bot className="h-4 w-4" />
        <span className="text-sm">Carregando modelos...</span>
      </div>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center space-x-2 min-w-[200px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <span className={providerColors[selectedModel.provider]}>
              {providerIcons[selectedModel.provider]}
            </span>
            <span className="text-sm font-medium">{selectedModel.name}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[300px]">
        {(() => {
          // Agrupar modelos por provider para melhor visualização
          const groupedModels = availableModels.reduce((acc, model) => {
            if (!acc[model.provider]) {
              acc[model.provider] = []
            }
            acc[model.provider].push(model)
            return acc
          }, {} as Record<string, typeof availableModels>)

          const providerOrder = ['groq', 'replicate', 'openai', 'anthropic', 'local']

          return providerOrder.map((provider) => {
            const models = groupedModels[provider]
            if (!models || models.length === 0) return null

            return (
              <div key={provider}>
                {/* Separador visual entre grupos */}
                {provider !== 'groq' && (
                  <div className="border-t border-border my-1" />
                )}

                {/* Header do grupo */}
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <div className="flex items-center space-x-2">
                    <span className={providerColors[provider as keyof typeof providerColors]}>
                      {providerIcons[provider as keyof typeof providerIcons]}
                    </span>
                    <span>{provider}</span>
                  </div>
                </div>

                {/* Modelos do grupo */}
                {models.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className="flex flex-col items-start space-y-1 p-3 cursor-pointer ml-2"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <span className="font-medium">{model.name}</span>
                      {model.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>Max tokens: {model.maxTokens.toLocaleString()}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )
          }).filter(Boolean)
        })()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
