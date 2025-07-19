'use client'

import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useAppStore } from "@/stores/app-store"
import { AuthenticatedRoute } from "@/components/auth/protected-route"

export default function Home() {
  const { loadModels, initializeWebSocket } = useAppStore()

  // Carregar modelos e inicializar WebSocket quando a aplicação iniciar
  useEffect(() => {
    loadModels()
    initializeWebSocket()
  }, [loadModels, initializeWebSocket])
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
