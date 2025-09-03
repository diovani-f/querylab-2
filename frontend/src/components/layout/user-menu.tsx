"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, Settings, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/auth-store"

export function UserMenu() {
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/login")}
          className="text-xs sm:text-sm"
        >
          <span className="hidden xs:inline">Entrar</span>
          <span className="xs:hidden">Login</span>
        </Button>
        <Button
          size="sm"
          onClick={() => router.push("/register")}
          className="text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Criar Conta</span>
          <span className="sm:hidden">Registro</span>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 h-8 px-2 sm:px-3">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium hidden sm:inline truncate max-w-[100px]">{user.nome}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.nome}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Saindo..." : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
