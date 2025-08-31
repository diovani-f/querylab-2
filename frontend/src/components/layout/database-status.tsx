'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Database } from 'lucide-react'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DatabaseStatus {
  status: 'ok' | 'partial' | 'error'
  services: {
    application: {
      status: 'ok' | 'error'
      connected: boolean
      type: string
    }
    queries: {
      status: 'ok' | 'error'
      connected: boolean
      type: string
    }
  }
}

function DatabaseStatusComponent() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Ref para evitar requisições duplicadas no React Strict Mode
  const hasInitialized = useRef(false)

  const fetchStatus = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }

      const data = await apiService.getSystemStatus()
      setStatus(data)
      setLastFetch(new Date())
      setRetryCount(0) // Reset retry count on success

      // Log apenas para refresh manual ou erros
      if (isManual) {
        console.log('🔄 Status atualizado manualmente:', data.status)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar status:', error)
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, []) // Sem dependências pois usa apenas setters

  const handleManualRefresh = useCallback(() => {
    fetchStatus(true)
  }, [fetchStatus])

  useEffect(() => {
    // Buscar status inicial apenas uma vez (evita duplicação no React Strict Mode)
    if (!hasInitialized.current) {
      hasInitialized.current = true
      fetchStatus()
    }
  }, []) // Array vazio = executa apenas uma vez

  useEffect(() => {
    // Configurar intervalo baseado no status atual
    const getUpdateInterval = () => {
      if (retryCount > 5) return 300000 // 5 minutos se muitos erros
      if (retryCount > 0) return 30000  // 30 segundos se há erros
      if (status?.status === 'ok') return 300000 // 5 minutos se tudo OK
      if (status?.status === 'partial') return 120000 // 2 minutos se parcial
      return 60000 // 1 minuto por padrão
    }

    // Só configurar intervalo se já temos um status inicial
    // E não estamos no carregamento inicial
    if (status && !loading) {
      const interval = setInterval(() => {
        fetchStatus()
      }, getUpdateInterval())

      return () => clearInterval(interval)
    }
  }, [status?.status, retryCount]) // Remover loading da dependência

  // Memoizar valores calculados para evitar re-renderizações desnecessárias
  const statusInfo = useMemo(() => {
    if (!status) return null

    const isQueryDbConnected = status.services.queries.connected
    const queryDbType = status.services.queries.type

    const statusColor = isQueryDbConnected ? 'bg-green-500' : 'bg-red-500'
    const statusText = isQueryDbConnected
      ? `${queryDbType.toUpperCase()} Conectado`
      : 'DB Desconectado'

    return {
      isQueryDbConnected,
      queryDbType,
      statusColor,
      statusText
    }
  }, [status])

  if (loading) {
    return (
      <div className="flex items-center space-x-2 rounded-lg border px-3 py-1.5">
        <Database className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Verificando...</span>
      </div>
    )
  }

  if (!status || !statusInfo) {
    return (
      <div className="flex items-center space-x-2 rounded-lg border px-3 py-1.5">
        <Database className="h-4 w-4 text-red-500" />
        <span className="text-sm">Erro</span>
        <div className="h-2 w-2 rounded-full bg-red-500" />
      </div>
    )
  }

  const getTooltipContent = () => {
    const formatLastUpdate = () => {
      if (!lastFetch) return 'Nunca'
      const now = new Date()
      const diff = Math.floor((now.getTime() - lastFetch.getTime()) / 1000)

      if (diff < 60) return `${diff}s atrás`
      if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
      return lastFetch.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    return (
      <div className="space-y-2">
        <div className="font-semibold">Status dos Serviços</div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span>Aplicação:</span>
            <span className={`text-xs px-2 py-1 rounded ${
              status.services.application.connected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {status.services.application.type}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Consultas:</span>
            <span className={`text-xs px-2 py-1 rounded ${
              status.services.queries.connected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {status.services.queries.type}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Última atualização:</span>
            <span>{formatLastUpdate()}</span>
          </div>
          {retryCount > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Tentativas de erro:</span>
              <span>{retryCount}</span>
            </div>
          )}
          <div className="mt-1 text-center">
            Clique para atualizar manualmente
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            {/* Ícone do banco de dados */}
            <Database className={`h-4 w-4 ${statusInfo.isQueryDbConnected ? 'text-green-600' : 'text-red-600'} ${isRefreshing ? 'animate-pulse' : ''}`} />

            {/* Status text */}
            <span className="text-sm font-medium">
              {statusInfo.statusText}
            </span>

            {/* Status indicator */}
            <div className={`h-2 w-2 rounded-full ${statusInfo.statusColor}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Memoizar o componente para evitar re-renderizações desnecessárias
export const DatabaseStatus = React.memo(DatabaseStatusComponent)
