'use client'

import React, { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { DataDictionary } from "@/components/DataDictionary"
import { AuthenticatedRoute } from "@/components/auth/protected-route"
import { useSidebar } from "@/hooks/use-sidebar"
import { useAppStore } from "@/stores/app-store"

export default function DicionarioPage() {
    const sidebar = useSidebar()
    const { initializeWebSocket } = useAppStore()

    useEffect(() => {
        initializeWebSocket()
    }, [initializeWebSocket])

    return (
        <AuthenticatedRoute>
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#09090b]">
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

                    {/* Dictionary Area */}
                    <main className="flex-1 overflow-y-auto">
                        <DataDictionary />
                    </main>
                </div>
            </div>
        </AuthenticatedRoute>
    )
}
