'use client'

import { useState, useEffect } from 'react'

export interface UserSettings {
  developerMode: boolean
  autoExecuteSQL: boolean
  theme: 'light' | 'dark' | 'system'
  defaultModel: string
}

const DEFAULT_SETTINGS: UserSettings = {
  developerMode: false,
  autoExecuteSQL: true,
  theme: 'system',
  defaultModel: 'groq-llama3-70b'
}

const STORAGE_KEY = 'querylab-user-settings'

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Carregar configurações do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedSettings = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do usuário:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Salvar configurações no localStorage
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error('Erro ao salvar configurações do usuário:', error)
    }
  }

  // Resetar configurações para o padrão
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Erro ao resetar configurações do usuário:', error)
    }
  }

  // Alternar modo desenvolvedor
  const toggleDeveloperMode = () => {
    updateSettings({ 
      developerMode: !settings.developerMode,
      autoExecuteSQL: !settings.developerMode ? false : true // Se ativar dev mode, desativar auto-execute
    })
  }

  // Alternar execução automática de SQL
  const toggleAutoExecuteSQL = () => {
    updateSettings({ autoExecuteSQL: !settings.autoExecuteSQL })
  }

  return {
    settings,
    isLoaded,
    updateSettings,
    resetSettings,
    toggleDeveloperMode,
    toggleAutoExecuteSQL
  }
}
