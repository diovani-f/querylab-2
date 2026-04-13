'use client'

import { Button } from "@/components/ui/button"
import { Zap, BarChart3, Menu, X, BookOpen, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { ModelSelector } from "@/components/ui/model-selector"
import { UserMenu } from "@/components/layout/user-menu"
import { DatabaseStatus } from "@/components/layout/database-status"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface HeaderProps {
  sidebarControls?: {
    isOpen: boolean
    isMobile: boolean
    toggle: () => void
    close: () => void
    open: () => void
  }
}

export function Header({ sidebarControls }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Mobile Menu Button + Logo */}
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Button */}
          {sidebarControls && (
            <Button
              variant="ghost"
              size="icon"
              onClick={sidebarControls.toggle}
              className="lg:hidden"
            >
              {sidebarControls.isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Logo e Título */}
          <Link href="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-xl font-bold text-foreground">QueryLab</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Text-to-SQL Platform</p>
            </div>
          </Link>
        </div>

        {/* Status e Configurações */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Link para Dicionário - Hidden on mobile */}
          {pathname === '/dicionario' ? (
            <Link href="/" className="hidden md:block">
              <Button variant="outline" size="sm" className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-900/50 dark:hover:bg-indigo-900/40">
                <ArrowLeft className="h-4 w-4 mr-2 text-indigo-500" />
                <span className="hidden lg:inline font-medium">Voltar ao Chat</span>
              </Button>
            </Link>
          ) : (
            <Link href="/dicionario" className="hidden md:block">
              <Button variant="outline" size="sm" className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-900/50 dark:hover:bg-indigo-900/40">
                <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                <span className="hidden lg:inline font-medium">Explorar Dados</span>
              </Button>
            </Link>
          )}

          {/* Link para Avaliações - Hidden on mobile */}
          <Link href="/evaluations" className="hidden md:block">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden lg:inline">Avaliações</span>
            </Button>
          </Link>

          {/* Seletor de Modelo - Compact on mobile */}
          <div className="hidden sm:block">
            <ModelSelector />
          </div>

          {/* Status do Banco - Hidden on mobile */}
          <div className="hidden md:block">
            <DatabaseStatus />
          </div>

          {/* Seletor de Tema */}
          <ThemeToggle />

          {/* Menu do Usuário */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
