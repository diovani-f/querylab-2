'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SQLProvider } from '@/types'

export interface UserSettings {
  developerMode: boolean
  autoExecuteSQL: boolean
  useParallelMode: boolean
  selectedProviders: SQLProvider[]
  theme: 'light' | 'dark' | 'system'
  defaultModel: string
}

interface SettingsStore extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void
  resetSettings: () => void
  toggleDeveloperMode: () => void
  toggleAutoExecuteSQL: () => void
  updateSelectedProviders: (providers: SQLProvider[]) => void
}

const VALID_PROVIDERS: SQLProvider[] = ['gemini', 'groq', 'deepseek']

const DEFAULT_SETTINGS: UserSettings = {
  developerMode: false,
  autoExecuteSQL: true,
  useParallelMode: true,
  selectedProviders: ['gemini', 'groq', 'deepseek'],
  theme: 'system',
  defaultModel: 'groq-llama3-70b'
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (settings) =>
        set((state) => ({ ...state, ...settings })),

      resetSettings: () => set(DEFAULT_SETTINGS),

      toggleDeveloperMode: () =>
        set((state) => ({
          developerMode: !state.developerMode,
          autoExecuteSQL: !state.developerMode ? false : true,
        })),

      toggleAutoExecuteSQL: () =>
        set((state) => ({ autoExecuteSQL: !state.autoExecuteSQL })),

      updateSelectedProviders: (providers) => {
        if (providers.length === 0) return
        const valid = providers.filter((p) => VALID_PROVIDERS.includes(p))
        if (valid.length === 0) return
        set({ selectedProviders: valid, useParallelMode: valid.length > 1 })
      },
    }),
    {
      name: 'querylab-user-settings',
      partialize: (state) => ({
        developerMode: state.developerMode,
        autoExecuteSQL: state.autoExecuteSQL,
        useParallelMode: state.useParallelMode,
        selectedProviders: state.selectedProviders,
        theme: state.theme,
        defaultModel: state.defaultModel,
      }),
      // Validar dados carregados do localStorage para evitar estado inválido
      merge: (persisted: any, current) => {
        const providers = Array.isArray(persisted?.selectedProviders)
          ? persisted.selectedProviders.filter((p: unknown) =>
              VALID_PROVIDERS.includes(p as SQLProvider)
            )
          : null
        return {
          ...current,
          ...persisted,
          selectedProviders:
            providers && providers.length > 0
              ? providers
              : DEFAULT_SETTINGS.selectedProviders,
        }
      },
    }
  )
)
