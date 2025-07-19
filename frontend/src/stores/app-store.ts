import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { AppState, ChatSession, Message, LLMModel, DatabaseConnection } from '@/types'
import { apiService } from '@/lib/api'
import { websocketService } from '@/lib/websocket'

// Função utilitária para normalizar datas
const normalizeMessage = (message: any): Message => ({
  ...message,
  timestamp: new Date(message.timestamp)
})

const normalizeSession = (session: any): ChatSession => ({
  ...session,
  createdAt: new Date(session.createdAt),
  updatedAt: new Date(session.updatedAt),
  messages: (session.messages || []).map(normalizeMessage)
})

interface AppStore extends AppState {
  // Actions
  setCurrentSession: (session: ChatSession | null) => void
  setSessions: (sessions: ChatSession[]) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  createNewSession: (title?: string) => Promise<void>
  updateSessionTitle: (sessionId: string, title: string) => void
  setSelectedModel: (model: LLMModel) => void
  setDatabaseConnection: (connection: DatabaseConnection) => void
  setConnectionStatus: (isConnected: boolean) => void
  loadSessions: () => void
  loadModels: () => Promise<void>
  deleteSession: (sessionId: string) => void
  sendMessage: (content: string) => Promise<void>
  initializeWebSocket: () => void
  disconnectWebSocket: () => void
}

const defaultModels: LLMModel[] = [
  {
    id: 'llama3-70b-8192',
    name: 'Llama 3 70B',
    description: 'Modelo padrão para consultas SQL',
    provider: 'groq',
    maxTokens: 8192,
    isDefault: true
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
      setCurrentSession: (session) => {
        const normalizedSession = session ? normalizeSession(session) : null
        set({ currentSession: normalizedSession })
      },

      setSessions: (sessions) => {
        const normalizedSessions = (sessions || []).map(normalizeSession)
        set({ sessions: normalizedSessions })
      },

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

      createNewSession: async (title) => {
        try {
          // Obter usuário do auth store
          const { useAuthStore } = await import('./auth-store')
          const user = useAuthStore.getState().user

          if (!user) {
            throw new Error('Usuário não autenticado')
          }

          // Criar sessão no backend primeiro
          const response = await apiService.post('/sessions', {
            title: title || `Nova Sessão ${new Date().toLocaleString()}`,
            model: get().selectedModel?.id || defaultModels[0].id,
            userId: user.id
          })

          if (response.success && response.session) {
            const newSession = normalizeSession(response.session)

            set((state) => ({
              currentSession: newSession,
              sessions: [newSession, ...state.sessions]
            }))
          }
        } catch (error) {
          console.error('Erro ao criar sessão:', error)
          // Fallback: criar sessão apenas localmente (temporário)
          const newSession: ChatSession = {
            id: `temp-${crypto.randomUUID()}`,
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
        }
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

      loadModels: async () => {
        try {
          const response = await apiService.get('/chat/models')
          if (response.success && response.models) {
            set(() => ({
              availableModels: response.models,
              selectedModel: response.models.find((m: LLMModel) => m.isDefault) || response.models[0]
            }))
            console.log(`✅ ${response.models.length} modelos LLM carregados`)
          }
        } catch (error) {
          console.error('❌ Erro ao carregar modelos:', error)
          // Usar modelos padrão em caso de erro
          set(() => ({
            availableModels: defaultModels,
            selectedModel: defaultModels[0]
          }))
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
          // Obter usuário do auth store
          const { useAuthStore } = await import('./auth-store')
          const user = useAuthStore.getState().user

          // Enviar via WebSocket (o backend vai adicionar a mensagem e retornar via WebSocket)
          websocketService.sendMessage({
            sessionId: state.currentSession.id,
            message: content,
            model: state.selectedModel.id,
            userId: user?.id
          })
        } catch (error) {
          console.error('Erro ao enviar mensagem:', error)
          throw error
        }
      },

      initializeWebSocket: () => {
        console.log('🔌 Inicializando WebSocket...')
        websocketService.connect()

        // Setup listeners
        websocketService.onMessageReceived((message: Message) => {
          console.log('📨 Mensagem recebida via WebSocket:', message)
          const normalizedMessage = normalizeMessage(message)
          get().addMessage(normalizedMessage)
        })

        websocketService.onError((error: string) => {
          console.error('❌ WebSocket error:', error)
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
