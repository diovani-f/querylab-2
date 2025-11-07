'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Loader2, Copy, Eye, Zap, Brain, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ParallelSQLResult {
  provider: 'gemini' | 'groq' | 'cloudflare'
  model: string
  success: boolean
  sql?: string
  explanation?: string
  processingTime: number
  error?: string
  validationWarnings?: string[]
  status: 'pending' | 'generating' | 'complete' | 'error'
}

interface ParallelSQLResultsProps {
  results: ParallelSQLResult[]
  isLoading?: boolean
  onSelectSQL?: (sql: string, provider: string) => void
}

const providerConfig = {
  gemini: {
    name: 'Gemini',
    icon: Brain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  groq: {
    name: 'Groq',
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  cloudflare: {
    name: 'Cloudflare',
    icon: Cloud,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
}

export function ParallelSQLResults({ results, isLoading = false, onSelectSQL }: ParallelSQLResultsProps) {
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>('gemini')

  // Auto-selecionar a primeira aba com sucesso
  useEffect(() => {
    const firstSuccess = results.find(r => r.success && r.sql)
    if (firstSuccess) {
      setSelectedTab(firstSuccess.provider)
    }
  }, [results])

  const handleCopySQL = async (sql: string, provider: string) => {
    try {
      await navigator.clipboard.writeText(sql)
      setCopiedProvider(provider)
      setTimeout(() => setCopiedProvider(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar SQL:', error)
    }
  }

  const getStatusBadge = (result: ParallelSQLResult) => {
    if (result.status === 'pending') {
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Aguardando</Badge>
    }
    if (result.status === 'generating') {
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Gerando</Badge>
    }
    if (result.status === 'complete' && result.success) {
      return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Sucesso</Badge>
    }
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Erro</Badge>
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Geração Paralela de SQL
        </h3>
        <div className="flex gap-2">
          {results.map((result) => {
            const config = providerConfig[result.provider]
            const Icon = config.icon
            return (
              <TooltipProvider key={result.provider}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md border",
                      result.success ? 'bg-green-50 border-green-200' :
                      result.status === 'error' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    )}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                      {result.status === 'generating' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {result.success && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {result.status === 'error' && <XCircle className="h-3 w-3 text-red-500" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.name}: {result.processingTime}ms</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {results.map((result) => {
            const config = providerConfig[result.provider]
            const Icon = config.icon
            return (
              <TabsTrigger
                key={result.provider}
                value={result.provider}
                className="gap-2"
              >
                <Icon className={cn("h-4 w-4", config.color)} />
                {config.name}
                {result.success && <CheckCircle className="h-3 w-3 text-green-500" />}
                {result.status === 'error' && <XCircle className="h-3 w-3 text-red-500" />}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {results.map((result) => {
          const config = providerConfig[result.provider]
          const Icon = config.icon

          return (
            <TabsContent key={result.provider} value={result.provider} className="space-y-4">
              <Card className={cn("border-2", config.borderColor)}>
                <CardHeader className={config.bgColor}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5", config.color)} />
                      <CardTitle>{config.name}</CardTitle>
                    </div>
                    {getStatusBadge(result)}
                  </div>
                  <CardDescription>
                    Modelo: {result.model} • Tempo: {result.processingTime}ms
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {result.success && result.sql ? (
                    <>
                      {/* Explicação */}
                      {result.explanation && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm text-blue-900">{result.explanation}</p>
                        </div>
                      )}

                      {/* SQL */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">SQL Gerado</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopySQL(result.sql!, result.provider)}
                            >
                              {copiedProvider === result.provider ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copiar
                                </>
                              )}
                            </Button>
                            {onSelectSQL && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => onSelectSQL(result.sql!, result.provider)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Usar este SQL
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="bg-black/5 rounded-md p-4 font-mono text-sm overflow-auto max-h-64">
                          <pre className="whitespace-pre-wrap break-all">{result.sql}</pre>
                        </div>
                      </div>

                      {/* Avisos de validação */}
                      {result.validationWarnings && result.validationWarnings.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <h4 className="text-sm font-medium text-yellow-900 mb-2">Avisos</h4>
                          <ul className="text-sm text-yellow-800 list-disc list-inside">
                            {result.validationWarnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : result.status === 'error' ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-900">
                        <strong>Erro:</strong> {result.error || 'Erro desconhecido'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Resumo de performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comparação de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {results.map((result) => {
              const config = providerConfig[result.provider]
              const Icon = config.icon
              return (
                <div key={result.provider} className="text-center">
                  <Icon className={cn("h-6 w-6 mx-auto mb-2", config.color)} />
                  <p className="text-xs font-medium">{config.name}</p>
                  <p className="text-lg font-bold">{result.processingTime}ms</p>
                  {result.success ? (
                    <Badge variant="outline" className="mt-1 text-xs bg-green-50">Sucesso</Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-xs bg-red-50">Falhou</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

