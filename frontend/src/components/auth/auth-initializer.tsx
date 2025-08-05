"use client"

import { ReactNode } from "react"
import { useApiErrorHandler } from "@/hooks/use-api-error-handler"

interface AuthInitializerProps {
  children: ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  // Inicializar interceptor de erros de API
  useApiErrorHandler()

  // Simplificar - deixar a verificação de auth para os componentes ProtectedRoute
  return <>{children}</>
}
