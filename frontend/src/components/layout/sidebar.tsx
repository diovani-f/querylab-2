'use client'

import { useState } from "react"
import { useHydration } from "@/hooks/use-hydration"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/stores/app-store"
import { MessageSquare, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/toast"
import { PulseLoader } from "react-spinners"

export function Sidebar() {
  const isHydrated = useHydration()
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { addToast } = useToast()
  const {
    sessions,
    currentSession,
    setCurrentSession,
    createNewSession,
    deleteSession
  } = useAppStore()

  // Garantir que sessions é sempre um array
  const safeSessions = Array.isArray(sessions) ? sessions : []

  // Não renderizar até estar hidratado
  if (!isHydrated) {
    return (
      <div className="w-80 border-r bg-muted/10 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const handleNewSession = async () => {
    await createNewSession()
  }

  const handleSelectSession = (sessionId: string) => {
    // Não permitir seleção se a sessão está sendo deletada
    if (isDeleting && sessionToDelete === sessionId) {
      return
    }

    const session = safeSessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
    }
  }

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessionToDelete(sessionId)
  }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return

    const sessionTitle = safeSessions.find(s => s.id === sessionToDelete)?.title || 'Sessão'

    setIsDeleting(true)

    try {
      // Aguardar a conclusão da requisição
      await deleteSession(sessionToDelete)

      // Só fechar o modal após sucesso
      setSessionToDelete(null)

      // Toast de sucesso
      addToast({
        type: 'success',
        title: 'Sessão deletada',
        description: `"${sessionTitle}" foi removida com sucesso.`,
        duration: 3000
      })
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)

      // Em caso de erro, também fechar o modal
      setSessionToDelete(null)

      // Toast de erro
      addToast({
        type: 'error',
        title: 'Erro ao deletar sessão',
        description: 'Não foi possível deletar a sessão. Tente novamente.',
        duration: 5000
      })
    } finally {
      // Sempre limpar o loading no final
      setIsDeleting(false)
    }
  }

  const cancelDeleteSession = () => {
    if (!isDeleting) {
      setSessionToDelete(null)
    }
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
          {safeSessions.length === 0 ? (
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
            safeSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center justify-between rounded-lg p-3 cursor-pointer transition-all duration-300",
                  currentSession?.id === session.id && "bg-accent",
                  isDeleting && sessionToDelete === session.id
                    ? "opacity-60 cursor-not-allowed bg-muted scale-95 transform"
                    : "hover:bg-accent hover:scale-[1.02]"
                )}
                onClick={() => handleSelectSession(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">
                    {session.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {(session.messages || []).length} mensagens
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
                  disabled={isDeleting}
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
          <p>Total: {safeSessions.length} sessões</p>
          <p>Modelo: {useAppStore.getState().selectedModel?.name}</p>
        </div>
      </div>

      {/* Modal de Confirmação de Delete */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && !isDeleting && cancelDeleteSession()}
      >
        <AlertDialogContent className={cn(isDeleting && "pointer-events-none")}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDeleting ? 'Deletando Sessão...' : 'Deletar Sessão'}
            </AlertDialogTitle>
            {isDeleting ? (
              <AlertDialogDescription className="text-center text-orange-600 font-medium">
                Processando exclusão da sessão...
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription>
                Tem certeza que deseja deletar esta sessão? Esta ação não pode ser desfeita.
                {sessionToDelete && (
                  <span className="block mt-2 font-medium">
                    "{safeSessions.find(s => s.id === sessionToDelete)?.title}"
                  </span>
                )}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSession}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Overlay Global */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl border flex flex-col items-center gap-4">
            <PulseLoader
              color="#f97316"
              size={15}
              speedMultiplier={0.8}
            />
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Deletando Sessão</h3>
              <p className="text-sm text-gray-600 mt-1">
                Aguarde enquanto processamos a exclusão...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
