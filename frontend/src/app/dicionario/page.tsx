'use client'

import React, { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { DataDictionary } from "@/components/DataDictionary"
import { SchemaERDiagram } from "@/components/SchemaERDiagram"
import { AuthenticatedRoute } from "@/components/auth/protected-route"
import { useSidebar } from "@/hooks/use-sidebar"
import { useAppStore } from "@/stores/app-store"

type Tab = 'dicionario' | 'diagrama'

export default function DicionarioPage() {
    const sidebar = useSidebar()
    const { initializeWebSocket } = useAppStore()
    const [activeTab, setActiveTab] = useState<Tab>('dicionario')

    useEffect(() => {
        initializeWebSocket()
    }, [initializeWebSocket])

    return (
        <AuthenticatedRoute>
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#09090b]">
                <Header sidebarControls={sidebar} />

                <div className="flex flex-1 overflow-hidden relative">
                    {sidebar.isMobile && sidebar.isOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={sidebar.close}
                        />
                    )}

                    <Sidebar sidebarControls={sidebar} />

                    <main className={`flex-1 flex flex-col ${activeTab === 'diagrama' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                        {/* Tab bar */}
                        <div className="shrink-0 bg-gray-50 dark:bg-[#09090b] border-b border-gray-200 dark:border-gray-800 px-4 md:px-8">
                            <div className="flex gap-0 max-w-6xl mx-auto">
                                {([
                                    { id: 'dicionario', label: 'Dicionário de Dados' },
                                    { id: 'diagrama', label: 'Diagrama de Tabelas' },
                                ] as { id: Tab; label: string }[]).map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                                            activeTab === tab.id
                                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeTab === 'dicionario' && <DataDictionary />}
                        {activeTab === 'diagrama' && (
                            <div className="flex-1 min-h-0">
                                <SchemaERDiagram />
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </AuthenticatedRoute>
    )
}
