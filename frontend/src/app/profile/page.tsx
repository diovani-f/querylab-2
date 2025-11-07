'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Settings, Code, Zap, RotateCcw, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useUserSettings } from '@/hooks/use-user-settings'
import { useAuthStore } from '@/stores/auth-store'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { settings, isLoaded, updateSettings, resetSettings, toggleDeveloperMode, toggleAutoExecuteSQL } = useUserSettings()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simular salvamento (já está sendo salvo automaticamente no localStorage)
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsSaving(false)
  }

  const handleReset = () => {
    resetSettings()
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Perfil e Configurações</h1>
              <p className="text-sm text-muted-foreground">Gerencie suas preferências do QueryLab</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Informações do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
            <CardDescription>
              Suas informações básicas de usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Nome</Label>
                <p className="text-sm text-muted-foreground mt-1">{user?.nome || 'Não informado'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{user?.email || 'Não informado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Geração de SQL com IA
              {settings.useParallelMode && (
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
                  Modo Paralelo
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure como a IA gera consultas SQL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="parallel-mode" className="text-sm font-medium">
                  Modo Paralelo (3 IAs)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Gera SQL com 3 modelos simultaneamente (Gemini, Groq, Cloudflare) para comparação
                </p>
              </div>
              <Switch
                id="parallel-mode"
                checked={settings.useParallelMode}
                onCheckedChange={(checked) => updateSettings({ useParallelMode: checked })}
              />
            </div>

            {settings.useParallelMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">Modo Paralelo Ativo</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Todas as consultas serão geradas por 3 modelos de IA diferentes simultaneamente.
                      Você poderá comparar os resultados e escolher o melhor SQL.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurações de Desenvolvimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Modo Desenvolvedor
              {settings.developerMode && (
                <Badge variant="secondary" className="ml-2">
                  Ativo
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Controle como as consultas SQL são executadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="developer-mode" className="text-sm font-medium">
                  Ativar Modo Desenvolvedor
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, você precisa clicar no botão "Executar" para rodar as consultas SQL geradas
                </p>
              </div>
              <Switch
                id="developer-mode"
                checked={settings.developerMode}
                onCheckedChange={toggleDeveloperMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-execute" className="text-sm font-medium">
                  Execução Automática de SQL
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, as consultas SQL são executadas automaticamente após serem geradas
                </p>
              </div>
              <Switch
                id="auto-execute"
                checked={settings.autoExecuteSQL}
                onCheckedChange={toggleAutoExecuteSQL}
                disabled={settings.developerMode}
              />
            </div>

            {settings.developerMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Code className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Modo Desenvolvedor Ativo</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Você terá controle total sobre quando executar as consultas SQL.
                      Isso é útil para revisar e validar o SQL antes da execução.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!settings.developerMode && settings.autoExecuteSQL && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900">Modo Automático Ativo</h4>
                    <p className="text-sm text-green-700 mt-1">
                      As consultas SQL serão geradas e executadas automaticamente,
                      proporcionando uma experiência mais fluida.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrões
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  )
}
