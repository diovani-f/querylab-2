"use client"

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Hook para interceptar e tratar erros de API globalmente
 * Especialmente útil para capturar erros 401/403 e redirecionar para login
 */
export function useApiErrorHandler() {
  const { logout } = useAuthStore()

  useEffect(() => {
    // Interceptar erros não capturados relacionados a autenticação
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason

      if (error instanceof Error) {
        // Verificar se é erro de autenticação
        if (error.message.includes('Token inválido') ||
            error.message.includes('401') ||
            error.message.includes('403')) {

          // Fazer logout e limpar estado
          logout().catch(() => {})

          // Redirecionar para login
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }
    }

    // Adicionar listener para promises rejeitadas
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [logout])
}
