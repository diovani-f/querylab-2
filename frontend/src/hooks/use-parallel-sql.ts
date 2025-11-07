import { useState, useCallback } from 'react'
import { apiService } from '@/lib/api'

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
  // Resultados da execução automática
  executionSuccess?: boolean
  executionTime?: number
  rowCount?: number
  data?: any[]
  executionError?: string
}

interface ParallelSQLResponse {
  success: boolean
  results: ParallelSQLResult[]
  reducedSchema?: string
  totalProcessingTime: number
  bestResult?: ParallelSQLResult
}

export function useParallelSQL() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ParallelSQLResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const generateParallelSQL = async (sessionId: string, question: string) => {
    setIsLoading(true)
    setError(null)

    // Inicializar resultados com status pending
    setResults([
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        success: false,
        status: 'pending',
        processingTime: 0
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        success: false,
        status: 'pending',
        processingTime: 0
      },
      {
        provider: 'cloudflare',
        model: 'sqlcoder-7b-2',
        success: false,
        status: 'pending',
        processingTime: 0
      }
    ])

    try {
      // Atualizar para status generating
      setResults(prev => prev.map(r => ({ ...r, status: 'generating' as const })))

      console.log('📡 Chamando API de geração paralela...', { sessionId, question })

      const response = await apiService.post('/chat/generate-sql-parallel', {
        sessionId,
        question
      }) as ParallelSQLResponse

      console.log('📥 Resposta recebida:', response)
      console.log('📥 Resultados:', response?.results)

      if (response && response.success) {
        console.log('✅ Geração paralela bem-sucedida:', response.results.length, 'resultados')

        // Log detalhado de cada resultado
        response.results.forEach((r: ParallelSQLResult, i: number) => {
          console.log(`📊 Resultado ${i} (${r.provider}):`, {
            success: r.success,
            executionSuccess: r.executionSuccess,
            rowCount: r.rowCount,
            hasData: !!r.data,
            dataLength: r.data?.length,
            sql: r.sql?.substring(0, 100)
          })
        })

        setResults(response.results)
        return response
      } else {
        console.error('❌ Geração paralela falhou. Response:', response)
        console.error('❌ response.success:', response?.success)
        console.error('❌ typeof response:', typeof response)
        console.error('❌ response keys:', response ? Object.keys(response) : 'null')
        throw new Error('Falha na geração paralela de SQL')
      }
    } catch (err) {
      console.error('❌ Erro no hook useParallelSQL:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)

      // Marcar todos como erro
      setResults(prev => prev.map(r => ({
        ...r,
        status: 'error' as const,
        error: errorMessage
      })))

      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const reset = useCallback(() => {
    setResults([])
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    generateParallelSQL,
    isLoading,
    results,
    error,
    reset
  }
}

