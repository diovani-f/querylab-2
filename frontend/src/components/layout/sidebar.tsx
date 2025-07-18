'use client'

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/stores/app-store"
import { MessageSquare, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    createNewSession, 
    deleteSession 
  } = useAppStore()

  const handleNewSession = () => {
    createNewSession()
  }

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
    }
  }

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSession(sessionId)
  }

  return (
    <div className="flex h-full w-80 flex-col border-r bg-muted/10">
      {/* Header da Sidebar */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Sessões</h2>
        <Button onClick={handleNewSession} size="sm" className="h-8 w-8 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista de Sessões */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Nenhuma sessão ainda.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em + para começar
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={cn(
                  "group flex items-center justify-between rounded-lg p-3 cursor-pointer transition-colors hover:bg-accent",
                  currentSession?.id === session.id && "bg-accent"
                )}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">
                    {session.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {session.messages.length} mensagens
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer da Sidebar */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Total: {sessions.length} sessões</p>
          <p>Modelo: {useAppStore.getState().selectedModel?.name}</p>
        </div>
      </div>
    </div>
  )
}
