import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { AppState, ChatSession, Message, LLMModel, DatabaseConnection } from '@/types'
import { apiService } from '@/lib/api'
import { websocketService } from '@/lib/websocket'

interface AppStore extends AppState {
  // Actions
  setCurrentSession: (session: ChatSession | null) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  createNewSession: (title?: string) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  setSelectedModel: (model: LLMModel) => void
  setDatabaseConnection: (connection: DatabaseConnection) => void
  setConnectionStatus: (isConnected: boolean) => void
  loadSessions: () => void
  deleteSession: (sessionId: string) => void
  sendMessage: (content: string) => Promise<void>
  initializeWebSocket: () => void
  disconnectWebSocket: () => void
}

const defaultModels: LLMModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'OpenAI GPT-4 - Mais avançado para consultas complexas',
    provider: 'openai',
    isAvailable: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'OpenAI GPT-3.5 - Rápido e eficiente',
    provider: 'openai',
    isAvailable: true
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    description: 'Anthropic Claude 3 - Excelente para análise de dados',
    provider: 'anthropic',
    isAvailable: true
  }
]

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      sessions: [],
      availableModels: defaultModels,
      selectedModel: defaultModels[0],
      databaseConnection: null,
      isConnected: false,
      user: null,

      // Actions
      setCurrentSession: (session) => set({ currentSession: session }),

      addMessage: (messageData) => {
        const message: Message = {
          ...messageData,
          id: crypto.randomUUID(),
          timestamp: new Date()
        }

        set((state) => {
          if (!state.currentSession) return state

          const updatedSession = {
            ...state.currentSession,
            messages: [...state.currentSession.messages, message],
            updatedAt: new Date()
          }

          const updatedSessions = state.sessions.map(session =>
            session.id === updatedSession.id ? updatedSession : session
          )

          return {
            currentSession: updatedSession,
            sessions: updatedSessions
          }
        })
      },

      createNewSession: (title) => {
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: title || `Nova Sessão ${new Date().toLocaleString()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
          model: get().selectedModel || defaultModels[0]
        }

        set((state) => ({
          currentSession: newSession,
          sessions: [newSession, ...state.sessions]
        }))
      },

      updateSessionTitle: (sessionId, title) => {
        set((state) => {
          const updatedSessions = state.sessions.map(session =>
            session.id === sessionId ? { ...session, title } : session
          )

          const updatedCurrentSession = state.currentSession?.id === sessionId
            ? { ...state.currentSession, title }
            : state.currentSession

          return {
            sessions: updatedSessions,
            currentSession: updatedCurrentSession
          }
        })
      },

      setSelectedModel: (model) => set({ selectedModel: model }),

      setDatabaseConnection: (connection) => set({ databaseConnection: connection }),

      setConnectionStatus: (isConnected) => set({ isConnected }),

      loadSessions: () => {
        // TODO: Implementar carregamento de sessões do localStorage ou API
        const savedSessions = localStorage.getItem('querylab-sessions')
        if (savedSessions) {
          try {
            const sessions = JSON.parse(savedSessions)
            set({ sessions })
          } catch (error) {
            console.error('Erro ao carregar sessões:', error)
          }
        }
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const updatedSessions = state.sessions.filter(session => session.id !== sessionId)
          const updatedCurrentSession = state.currentSession?.id === sessionId
            ? null
            : state.currentSession

          return {
            sessions: updatedSessions,
            currentSession: updatedCurrentSession
          }
        })
      },

      sendMessage: async (content: string) => {
        const state = get()
        if (!state.currentSession || !state.selectedModel) {
          throw new Error('Nenhuma sessão ativa ou modelo selecionado')
        }

        try {
          // Enviar via WebSocket
          websocketService.sendMessage({
            sessionId: state.currentSession.id,
            message: content,
            model: state.selectedModel.id
          })
        } catch (error) {
          console.error('Erro ao enviar mensagem:', error)
          throw error
        }
      },

      initializeWebSocket: () => {
        websocketService.connect()

        // Setup listeners
        websocketService.onMessageReceived((message: Message) => {
          get().addMessage(message)
        })

        websocketService.onError((error: string) => {
          console.error('WebSocket error:', error)
        })
      },

      disconnectWebSocket: () => {
        websocketService.disconnect()
      }
    }),
    {
      name: 'querylab-store'
    }
  )
)
