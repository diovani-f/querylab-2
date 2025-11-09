'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Eye, Zap, Brain, Cloud, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'

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
  executionSuccess?: boolean
  executionTime?: number
  rowCount?: number
  data?: any[]
  executionError?: string
}

interface ParallelResultsPreviewProps {
  results: ParallelSQLResult[]
  onSelectResult: (result: ParallelSQLResult) => void
  onClose?: () => void
}

const providerConfig = {
  gemini: {
    name: 'Gemini',
    icon: Brain,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  groq: {
    name: 'Groq',
    icon: Zap,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  cloudflare: {
    name: 'Cloudflare',
    icon: Cloud,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800'
  }
}

export function ParallelResultsPreview({ results, onSelectResult, onClose }: ParallelResultsPreviewProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  const toggleExpand = (provider: string) => {
    setExpandedProvider(expandedProvider === provider ? null : provider)
  }

  const getStatusBadge = (result: ParallelSQLResult) => {
    if (result.status === 'pending' || result.status === 'generating') {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {result.status === 'pending' ? 'Aguardando' : 'Gerando'}
        </Badge>
      )
    }

    if (result.executionSuccess) {
      return (
        <Badge className="gap-1 bg-green-600 dark:bg-green-700">
          <CheckCircle className="h-3 w-3" />
          {result.rowCount} resultado(s)
        </Badge>
      )
    }

    if (result.success && !result.executionSuccess) {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <XCircle className="h-3 w-3" />
          SQL gerado, erro na execução
        </Badge>
      )
    }

    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Erro
      </Badge>
    )
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Zap className="h-4 w-4 text-yellow-500" />
          Modo Paralelo - 3 IAs gerando simultaneamente
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        )}
      </div>

      {/* Grid com 3 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {results.map((result) => {
          const config = providerConfig[result.provider]
          const Icon = config.icon
          const isExpanded = expandedProvider === result.provider

          return (
            <Card
              key={result.provider}
              className={`${config.borderColor} border-2 transition-all hover:shadow-md flex flex-col h-full`}
            >
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <CardTitle className="text-sm">{config.name}</CardTitle>
                    </div>
                    {getStatusBadge(result)}
                  </div>
                  <Badge variant="outline" className="text-xs w-fit">{result.model}</Badge>
                </div>

                {result.executionSuccess && (
                  <CardDescription className="text-xs mt-2">
                    Geração: {result.processingTime}ms | Execução: {result.executionTime}ms
                  </CardDescription>
                )}
              </CardHeader>

              {result.executionSuccess && result.data && result.data.length > 0 && (
                <CardContent className="space-y-3 flex-grow flex flex-col">
                  {/* Preview dos dados */}
                  <div className={`rounded-lg p-2 ${config.bgColor} flex-grow overflow-hidden`}>
                    <div className="text-xs font-medium mb-2 text-muted-foreground">
                      Preview ({result.rowCount} total)
                    </div>
                    <div className="overflow-auto max-h-48">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-inherit">
                          <tr className="border-b dark:border-gray-700">
                            {Object.keys(result.data[0] || {}).map((key) => (
                              <th key={key} className="text-left p-1.5 font-medium text-xs">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.slice(0, 3).map((row, idx) => (
                            <tr key={idx} className="border-b dark:border-gray-800">
                              {Object.values(row).map((value: any, colIdx) => (
                                <td key={colIdx} className="p-1.5 text-xs">
                                  {String(value).substring(0, 30)}
                                  {String(value).length > 30 ? '...' : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {result.data.length > 3 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        +{result.data.length - 3} linha(s)
                      </div>
                    )}
                  </div>

                  {/* SQL expandível */}
                  <div className="flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(result.provider)}
                      className="w-full justify-between text-xs h-8"
                    >
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {isExpanded ? 'Ocultar SQL' : 'Ver SQL'}
                      </span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>

                    {isExpanded && result.sql && (
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-32">
                        <code>{result.sql}</code>
                      </pre>
                    )}
                  </div>

                  {/* Botão para usar este resultado */}
                  <Button
                    onClick={() => onSelectResult(result)}
                    className="w-full flex-shrink-0"
                    size="sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Usar Resultado
                  </Button>
                </CardContent>
              )}

              {/* Caso: Execução bem-sucedida mas sem resultados (0 linhas) */}
              {result.executionSuccess && (!result.data || result.data.length === 0) && (
                <CardContent className="space-y-3 flex-grow flex flex-col">
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded flex-grow">
                    <strong>Aviso:</strong> A consulta foi executada com sucesso, mas não retornou nenhum resultado (0 linhas).
                  </div>

                  {/* SQL expandível */}
                  {result.sql && (
                    <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(result.provider)}
                        className="w-full justify-between text-xs h-8"
                      >
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {isExpanded ? 'Ocultar SQL' : 'Ver SQL'}
                        </span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>

                      {isExpanded && (
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-32">
                          <code>{result.sql}</code>
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Botão para usar este resultado */}
                  <Button
                    onClick={() => onSelectResult(result)}
                    className="w-full flex-shrink-0"
                    variant="outline"
                    size="sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Usar Resultado (0 linhas)
                  </Button>
                </CardContent>
              )}

              {/* Mostrar erro se houver */}
              {(result.error || result.executionError) && (
                <CardContent className="space-y-3 flex-grow flex flex-col">
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded flex-grow">
                    <strong>Erro:</strong> {result.executionError || result.error}
                  </div>

                  {/* Mostrar SQL mesmo com erro */}
                  {result.sql && (
                    <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(result.provider)}
                        className="w-full justify-between text-xs h-8"
                      >
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {isExpanded ? 'Ocultar SQL' : 'Ver SQL'}
                        </span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>

                      {isExpanded && (
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-32">
                          <code>{result.sql}</code>
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Botão para usar este resultado mesmo com erro - permite "liberar" o chat */}
                  {result.sql && (
                    <Button
                      onClick={() => onSelectResult(result)}
                      className="w-full flex-shrink-0"
                      variant="outline"
                      size="sm"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Usar SQL (mesmo com erro)
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

