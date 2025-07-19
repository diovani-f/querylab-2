"use client"

import { useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { useAuthStore } from "@/stores/auth-store"

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/login"
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, checkAuth, user, token, isHydrated, isCheckingAuth } = useAuth()

  useEffect(() => {
    // Verificar autenticação apenas uma vez quando o componente monta e está hidratado
    if (isHydrated && token && !isAuthenticated && !isLoading && !isCheckingAuth) {
      console.log('🛡️ ProtectedRoute - Verificando token existente...')
      checkAuth()
    }
  }, [isHydrated, token, isAuthenticated, isLoading, isCheckingAuth, checkAuth])

  useEffect(() => {
    // Redirecionar apenas se estiver hidratado, não carregando e não autenticado
    if (isHydrated && !isLoading && requireAuth && !isAuthenticated && !token) {
      console.log('🔒 Redirecionando para login - usuário não autenticado')
      router.push(redirectTo)
    }
  }, [isHydrated, isAuthenticated, isLoading, requireAuth, redirectTo, router, token])

  // Mostrar loading enquanto verifica autenticação ou se ainda está hidratando
  if (!isHydrated || isLoading || isCheckingAuth || (requireAuth && token && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!isHydrated ? 'Carregando...' : 'Verificando autenticação...'}
          </p>
        </div>
      </div>
    )
  }

  // Se requer autenticação mas não está autenticado e não tem token, não renderizar nada
  // (o useEffect acima já redirecionou)
  if (requireAuth && !isAuthenticated && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    )
  }

  // Log para debug
  if (isAuthenticated && user) {
    console.log('✅ Usuário autenticado:', user.nome, `(${user.email})`)
  }

  // Se não requer autenticação ou está autenticado, renderizar children
  return <>{children}</>
}

// Componente específico para rotas que requerem autenticação
export function AuthenticatedRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true}>
      {children}
    </ProtectedRoute>
  )
}

// Componente específico para rotas que NÃO devem ser acessadas por usuários autenticados
export function UnauthenticatedRoute({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}
