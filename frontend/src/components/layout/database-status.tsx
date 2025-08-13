'use client'

import { useState, useEffect } from 'react'
import { Database, Wifi, WifiOff, Shield, ShieldCheck } from 'lucide-react'
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
    vpn: {
      status: 'connected' | 'disconnected'
      name?: string
    }
  }
}

export function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStatus = async (isManual = false) => {
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

      if (isManual) {
        console.log('🔄 Status atualizado manualmente:', data.status)
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error)
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleManualRefresh = () => {
    fetchStatus(true)
  }

  useEffect(() => {
    // Buscar status inicial
    fetchStatus()

    // Estratégia inteligente de atualização:
    // - Se tudo OK: atualizar a cada 5 minutos
    // - Se há problemas: atualizar a cada 2 minutos
    // - Se muitos erros: atualizar a cada 30 segundos (máximo 5 tentativas)

    const getUpdateInterval = () => {
      if (retryCount > 5) return 300000 // 5 minutos se muitos erros
      if (retryCount > 0) return 30000  // 30 segundos se há erros
      if (status?.status === 'ok') return 300000 // 5 minutos se tudo OK
      if (status?.status === 'partial') return 120000 // 2 minutos se parcial
      return 60000 // 1 minuto por padrão
    }

    const interval = setInterval(() => {
      fetchStatus()
    }, getUpdateInterval())

    return () => clearInterval(interval)
  }, [status?.status, retryCount])

  if (loading) {
    return (
      <div className="flex items-center space-x-2 rounded-lg border px-3 py-1.5">
        <Database className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Verificando...</span>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex items-center space-x-2 rounded-lg border px-3 py-1.5">
        <Database className="h-4 w-4 text-red-500" />
        <span className="text-sm">Erro</span>
        <div className="h-2 w-2 rounded-full bg-red-500" />
      </div>
    )
  }

  const isQueryDbConnected = status.services.queries.connected
  const isVpnConnected = status.services.vpn.status === 'connected'
  const queryDbType = status.services.queries.type

  const getStatusColor = () => {
    if (isQueryDbConnected) return 'bg-green-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (isQueryDbConnected) {
      return `${queryDbType.toUpperCase()} Conectado`
    }
    return 'DB Desconectado'
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

          <div className="flex items-center justify-between">
            <span>VPN:</span>
            <span className={`text-xs px-2 py-1 rounded ${
              isVpnConnected
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isVpnConnected ? status.services.vpn.name || 'Conectada' : 'Desconectada'}
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
            <Database className={`h-4 w-4 ${isQueryDbConnected ? 'text-green-600' : 'text-red-600'} ${isRefreshing ? 'animate-pulse' : ''}`} />

            {/* Ícone da VPN */}
            {isVpnConnected ? (
              <Shield className="h-3 w-3 text-blue-600" />
            ) : (
              <Wifi className="h-3 w-3 text-gray-400" />
            )}

            {/* Status text */}
            <span className="text-sm font-medium">
              {getStatusText()}
            </span>

            {/* Status indicator */}
            <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
