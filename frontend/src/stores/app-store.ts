import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { AppState, ChatSession, Message, LLMModel, DatabaseConnection, QueryEvaluation } from '@/types'
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
  updateMessageEvaluation: (messageId: string, evaluation: QueryEvaluation) => void
  createNewSession: (title?: string) => Promise<void>
  updateSessionTitle: (sessionId: string, title: string) => void
  setSelectedModel: (model: LLMModel) => void
  setDatabaseConnection: (connection: DatabaseConnection) => void
  setConnectionStatus: (isConnected: boolean) => void
  loadSessions: () => Promise<void>
  loadModels: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  initializeWebSocket: () => void
  disconnectWebSocket: () => void
  setIsProcessing: (value: boolean) => void
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
      isProcessing: false,

      setIsProcessing: (value) => set({ isProcessing: value }),

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

      updateMessageEvaluation: (messageId, evaluation) => {
        set((state) => {
          if (!state.currentSession) return state

          const updatedMessages = state.currentSession.messages.map(message =>
            message.id === messageId
              ? { ...message, evaluation }
              : message
          )

          const updatedSession = {
            ...state.currentSession,
            messages: updatedMessages,
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

      loadSessions: async () => {
        try {
          // Obter usuário do auth store
          const { useAuthStore } = await import('./auth-store')
          const user = useAuthStore.getState().user

          if (!user) {
            console.log('⚠️ Usuário não autenticado - não carregando sessões')
            return
          }

          console.log('🔄 Carregando sessões do usuário:', user.id, typeof user.id)

          // Buscar sessões do usuário na API
          const response = await apiService.get(`/sessions/user/${user.id}`)

          if (response.success && response.sessions) {
            const normalizedSessions = response.sessions.map(normalizeSession)
            set({ sessions: normalizedSessions })
            console.log('✅ Sessões carregadas:', normalizedSessions.length, 'sessões')
          } else {
            console.log('ℹ️ Nenhuma sessão encontrada para o usuário')
            set({ sessions: [] })
          }
        } catch (error) {
          console.error('❌ Erro ao carregar sessões:', error)

          // Se for erro de autenticação, não fazer nada - o interceptor vai tratar
          if (error instanceof Error &&
              (error.message.includes('Token inválido') ||
               error.message.includes('401') ||
               error.message.includes('403'))) {
            // Deixar o interceptor global tratar
            throw error
          }

          // Em caso de outros erros, tentar carregar do localStorage como fallback
          const savedSessions = localStorage.getItem('querylab-sessions')
          if (savedSessions) {
            try {
              const sessions = JSON.parse(savedSessions)
              const normalizedSessions = sessions.map(normalizeSession)
              set({ sessions: normalizedSessions })
              console.log('📦 Sessões carregadas do localStorage como fallback')
            } catch (parseError) {
              console.error('Erro ao carregar sessões do localStorage:', parseError)
              set({ sessions: [] })
            }
          } else {
            set({ sessions: [] })
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

          // Se for erro de autenticação, não fazer nada - o interceptor vai tratar
          if (error instanceof Error &&
              (error.message.includes('Token inválido') ||
               error.message.includes('401') ||
               error.message.includes('403'))) {
            // Deixar o interceptor global tratar
            throw error
          }

          // Usar modelos padrão em caso de outros erros
          set(() => ({
            availableModels: defaultModels,
            selectedModel: defaultModels[0]
          }))
        }
      },

      deleteSession: async (sessionId) => {
        try {
          // Fazer requisição para o backend para deletar a sessão
          const response = await apiService.delete(`/sessions/${sessionId}`)

          if (response.success) {
            // Se deletou com sucesso no backend, remover do estado local
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
            console.log(`✅ Sessão ${sessionId} deletada com sucesso`)
          } else {
            console.error('❌ Erro ao deletar sessão no backend:', response.error)
            throw new Error(response.error || 'Erro ao deletar sessão')
          }
        } catch (error) {
          console.error('❌ Erro ao deletar sessão:', error)

          // Em caso de erro, ainda remover localmente como fallback
          // mas mostrar um aviso ao usuário
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

          // Re-throw o erro para que o componente possa tratar se necessário
          throw error
        }
      },

      sendMessage: async (content: string) => {
        const state = get()
        if (!state.currentSession || !state.selectedModel) {
          throw new Error('Nenhuma sessão ativa ou modelo selecionado')
        }

        set({ isProcessing: true });

        try {
          // Obter usuário do auth store
          const { useAuthStore } = await import('./auth-store')
          const user = useAuthStore.getState().user

          // Garantir que o userId seja um número válido
          let userId = user?.id
          if (userId && typeof userId === 'string') {
            // Se for uma string hexadecimal como "82ec", converter para número
            if (/^[0-9a-fA-F]+$/.test(userId)) {
              userId = parseInt(userId, 16)
            } else {
              userId = parseInt(userId, 10)
            }
          }

          // Enviar via WebSocket (o backend vai adicionar a mensagem e retornar via WebSocket)
          websocketService.sendMessage({
            sessionId: state.currentSession.id,
            message: content,
            model: state.selectedModel.id,
            userId: userId
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
          set({ isProcessing: false });
          console.log('📨 Mensagem recebida via WebSocket:', message)
          const normalizedMessage = normalizeMessage(message)
          get().addMessage(normalizedMessage)
        })

        websocketService.onError((error: string) => {
          set({ isProcessing: false });
          console.error('❌ WebSocket error:', error)
        })

        websocketService.onEvaluationUpdated((data: { messageId: string, evaluation: any }) => {
          console.log('📊 Avaliação atualizada via WebSocket:', data)
          get().updateMessageEvaluation(data.messageId, data.evaluation)
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
