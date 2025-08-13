'use client'

import { Button } from "@/components/ui/button"
import { Zap, BarChart3 } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { useTheme } from "@/components/theme/theme-provider"
import { ModelSelector } from "@/components/ui/model-selector"
import { UserMenu } from "@/components/layout/user-menu"
import { DatabaseStatus } from "@/components/layout/database-status"
import Link from "next/link"

export function Header() {
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
          {/* Link para Avaliações */}
          <Link href="/evaluations">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Avaliações
            </Button>
          </Link>

          {/* Seletor de Modelo */}
          <ModelSelector />

          {/* Status do Banco */}
          <DatabaseStatus />

          {/* Seletor de Tema */}
          <ThemeToggle />

          {/* Menu do Usuário */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
