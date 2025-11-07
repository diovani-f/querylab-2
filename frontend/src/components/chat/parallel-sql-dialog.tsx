'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Zap, Sparkles } from 'lucide-react'
import { ParallelSQLResults } from './parallel-sql-results'
import { useParallelSQL } from '@/hooks/use-parallel-sql'
import { useAppStore } from '@/stores/app-store'
import { Badge } from '@/components/ui/badge'

interface ParallelSQLDialogProps {
  question: string
  onSelectSQL?: (sql: string, provider: string) => void
}

export function ParallelSQLDialog({ question, onSelectSQL }: ParallelSQLDialogProps) {
  const [open, setOpen] = useState(false)
  const { generateParallelSQL, isLoading, results, error, reset } = useParallelSQL()
  const { currentSession } = useAppStore()

  const handleGenerate = async () => {
    if (!currentSession?.id) {
      console.error('Nenhuma sessão ativa')
      return
    }

    try {
      await generateParallelSQL(currentSession.id, question)
    } catch (err) {
      console.error('Erro ao gerar SQL paralelo:', err)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Resetar ao fechar
      setTimeout(() => reset(), 300)
    } else {
      // Gerar automaticamente ao abrir
      handleGenerate()
    }
  }

  const handleSelectSQL = (sql: string, provider: string) => {
    if (onSelectSQL) {
      onSelectSQL(sql, provider)
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Modo Paralelo
          <Badge variant="secondary" className="ml-1">3 IAs</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Geração Paralela de SQL
          </DialogTitle>
          <DialogDescription>
            Gerando SQL simultaneamente com 3 modelos de IA diferentes para comparação
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Pergunta */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Pergunta:</h4>
            <p className="text-sm text-blue-800">{question}</p>
          </div>

          {/* Resultados */}
          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-900">
                <strong>Erro:</strong> {error}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleGenerate}
              >
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <ParallelSQLResults 
              results={results} 
              isLoading={isLoading}
              onSelectSQL={handleSelectSQL}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

