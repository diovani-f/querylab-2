'use client'

import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useAppStore } from "@/stores/app-store"
import { useAuthStore } from "@/stores/auth-store"
import { AuthenticatedRoute } from "@/components/auth/protected-route"
import { useSidebar } from "@/hooks/use-sidebar"

export default function Home() {
  const { loadModels, loadSessions, initializeWebSocket } = useAppStore()
  const { isAuthenticated, user } = useAuthStore()
  const sidebar = useSidebar()

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
        <Header sidebarControls={sidebar} />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar Overlay for Mobile */}
          {sidebar.isMobile && sidebar.isOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={sidebar.close}
            />
          )}

          {/* Sidebar */}
          <Sidebar sidebarControls={sidebar} />

          {/* Chat Area */}
          <main className="flex-1 flex flex-col min-w-0">
            <ChatInterface />
          </main>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
