'use client'

import { useEffect } from "react"
import { Header } from "src/components/layout/header"
import { Sidebar } from "src/components/layout/sidebar"
import { ChatInterface } from "src/components/chat/chat-interface"
import { useAppStore } from "@/stores/app-store"
import { useAuthStore } from "@/stores/auth-store"
import { AuthenticatedRoute } from "src/components/auth/protected-route"

export default function Home() {
  const { loadModels, loadSessions, initializeWebSocket } = useAppStore()
  const { isAuthenticated, user } = useAuthStore()

  // Carregar modelos e inicializar WebSocket quando a aplicação iniciar
  useEffect(() => {
    loadModels()
    initializeWebSocket()
  }, [loadModels, initializeWebSocket])

  // Carregar sessões apenas quando o usuário estiver autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 Usuário autenticado, carregando sessões...')
      loadSessions()
    }
  }, [isAuthenticated, user, loadSessions])

  return (
    <AuthenticatedRoute>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Chat Area */}
          <main className="flex-1 flex flex-col">
            <ChatInterface />
          </main>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
