"use client"

import { ReactNode } from "react"

interface AuthInitializerProps {
  children: ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  // Simplificar - deixar a verificação de auth para os componentes ProtectedRoute
  return <>{children}</>
}
