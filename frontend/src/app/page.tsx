'use client'

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { ChatInterface } from "@/components/chat/chat-interface"

export default function Home() {
  return (
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
  )
}
