'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Zap } from 'lucide-react'
import { useUserSettings } from '@/hooks/use-user-settings'

export function ParallelModeToggle() {
  const { settings, updateSettings } = useUserSettings()

  return (
    <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Zap className="h-5 w-5 text-yellow-500" />
        <div className="space-y-0.5">
          <Label htmlFor="parallel-mode" className="text-base font-medium">
            Modo Paralelo (3 IAs)
          </Label>
          <p className="text-sm text-muted-foreground">
            Gera SQL com 3 modelos simultaneamente (Gemini, Groq, Cloudflare)
          </p>
        </div>
      </div>
      <Switch
        id="parallel-mode"
        checked={settings.useParallelMode}
        onCheckedChange={(checked) => updateSettings({ useParallelMode: checked })}
      />
    </div>
  )
}

