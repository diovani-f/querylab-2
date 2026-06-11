'use client'

import { useUserSettings } from '@/hooks/use-user-settings'
import { ProviderSelector } from './provider-selector'

export function ParallelModeToggle() {
  const { settings, updateSelectedProviders } = useUserSettings()

  return (
    <div className="p-4 border rounded-lg">
      <ProviderSelector
        selectedProviders={settings.selectedProviders?.length ? settings.selectedProviders : ['gemini', 'groq', 'deepseek']}
        onChange={updateSelectedProviders}
      />
    </div>
  )
}
