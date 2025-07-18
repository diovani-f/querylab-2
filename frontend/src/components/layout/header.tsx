'use client'

import { Button } from "@/components/ui/button"
import { useAppStore } from "@/stores/app-store"
import { Database, Settings, Zap } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { useTheme } from "@/components/theme/theme-provider"

export function Header() {
  const { selectedModel, databaseConnection, isConnected } = useAppStore()
  const { theme } = useTheme()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo e Título */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">QueryLab</h1>
            <p className="text-xs text-muted-foreground">Text-to-SQL Platform</p>
          </div>
        </div>

        {/* Status e Configurações */}
        <div className="flex items-center space-x-4">
          {/* Status do Modelo */}
          <div className="flex items-center space-x-2 rounded-lg border px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">{selectedModel?.name || 'Nenhum modelo'}</span>
          </div>

          {/* Status do Banco */}
          <div className="flex items-center space-x-2 rounded-lg border px-3 py-1.5">
            <Database className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>

          {/* Seletor de Tema */}
          <ThemeToggle />

          {/* Botão de Configurações */}
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
