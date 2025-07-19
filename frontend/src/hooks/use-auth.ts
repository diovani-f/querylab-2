"use client"

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export function useAuth() {
  const authStore = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Aguardar a hidratação do Zustand
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Retornar estado de loading até que a hidratação seja concluída
  if (!isHydrated) {
    return {
      ...authStore,
      isLoading: true,
      isHydrated: false
    }
  }

  return {
    ...authStore,
    isHydrated: true
  }
}
