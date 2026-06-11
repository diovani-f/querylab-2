'use client'

import { Brain, Zap, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SQLProvider } from '@/types'

interface ProviderSelectorProps {
  selectedProviders: SQLProvider[]
  onChange: (providers: SQLProvider[]) => void
}

const PROVIDERS: { id: SQLProvider; label: string; icon: React.ElementType; color: string; activeBg: string; activeBorder: string }[] = [
  {
    id: 'gemini',
    label: 'Gemini',
    icon: Brain,
    color: 'text-blue-600 dark:text-blue-400',
    activeBg: 'bg-blue-50 dark:bg-blue-950/40',
    activeBorder: 'border-blue-400 dark:border-blue-500'
  },
  {
    id: 'groq',
    label: 'Groq',
    icon: Zap,
    color: 'text-orange-600 dark:text-orange-400',
    activeBg: 'bg-orange-50 dark:bg-orange-950/40',
    activeBorder: 'border-orange-400 dark:border-orange-500'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    icon: Cpu,
    color: 'text-purple-600 dark:text-purple-400',
    activeBg: 'bg-purple-50 dark:bg-purple-950/40',
    activeBorder: 'border-purple-400 dark:border-purple-500'
  }
]

function getModeLabel(count: number): string {
  if (count === 1) return '1 IA selecionada (mais rápido)'
  if (count === 2) return 'Comparando 2 IAs'
  return 'Comparação completa (3 IAs)'
}

export function ProviderSelector({ selectedProviders, onChange }: ProviderSelectorProps) {
  const toggle = (id: SQLProvider) => {
    if (selectedProviders.includes(id)) {
      // Não permite desativar o último
      if (selectedProviders.length === 1) return
      onChange(selectedProviders.filter(p => p !== id))
    } else {
      onChange([...selectedProviders, id])
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">IAs para geração de SQL</div>
      <div className="flex gap-2">
        {PROVIDERS.map(({ id, label, icon: Icon, color, activeBg, activeBorder }) => {
          const isActive = selectedProviders.includes(id)
          const isDisabled = isActive && selectedProviders.length === 1

          return (
            <button
              key={id}
              type="button"
              disabled={isDisabled}
              onClick={() => toggle(id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 text-xs font-medium transition-all',
                isActive
                  ? `${activeBg} ${activeBorder} ${color}`
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60',
                isDisabled && 'cursor-not-allowed'
              )}
              aria-pressed={isActive}
              title={isDisabled ? 'Pelo menos 1 IA deve estar ativa' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{getModeLabel(selectedProviders.length)}</p>
    </div>
  )
}
