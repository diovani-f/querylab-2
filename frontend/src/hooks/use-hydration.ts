"use client"

import { useEffect, useState } from 'react'

/**
 * Hook para garantir que o componente só renderize após a hidratação
 * Útil para evitar erros de hidratação com extensões do navegador
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

/**
 * Hook para detectar se estamos no cliente
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}
