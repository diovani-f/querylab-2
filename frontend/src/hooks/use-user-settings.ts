'use client'

export type { UserSettings } from '@/stores/settings-store'

import { useSettingsStore } from '@/stores/settings-store'
import type { UserSettings } from '@/stores/settings-store'

// Wrapper mantendo a mesma API pública do hook anterior.
// O estado agora vive no Zustand (global + persistido), então todas as
// instâncias deste hook compartilham o mesmo estado reativo.
export function useUserSettings() {
  const store = useSettingsStore()

  const settings: UserSettings = {
    developerMode: store.developerMode,
    autoExecuteSQL: store.autoExecuteSQL,
    useParallelMode: store.useParallelMode,
    selectedProviders: store.selectedProviders,
    theme: store.theme,
    defaultModel: store.defaultModel,
  }

  return {
    settings,
    isLoaded: true, // Zustand + persist hidrata de forma síncrona
    updateSettings: store.updateSettings,
    resetSettings: store.resetSettings,
    toggleDeveloperMode: store.toggleDeveloperMode,
    toggleAutoExecuteSQL: store.toggleAutoExecuteSQL,
    updateSelectedProviders: store.updateSelectedProviders,
  }
}
