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
  mensagens: (session.mensagens || []).map(normalizeMessage),
  messageCount: session._count?.mensagens || session.mensagens?.length || 0
})

const normalizeSessionSummary = (session: any): ChatSession => ({
  ...session,
  createdAt: new Date(session.createdAt),
  updatedAt: new Date(session.updatedAt),
  mensagens: [], // Não carregar mensagens no resumo
  messageCount: session._count?.mensagens || 0
})

interface AppStore extends AppState {
  // Actions
  setCurrentSession: (session: ChatSession | null) => void
  setSessions: (sessions: ChatSession[]) => void
  addMessage: (message: Partial<Message> & Pick<Message, 'tipo' | 'conteudo'>) => void
  updateMessageEvaluation: (messageId: string, evaluation: QueryEvaluation) => void
  createNewSession: (title?: string) => Promise<void>
  updateSessionTitle: (sessionId: string, title: string) => void
  setSelectedModel: (model: LLMModel) => void
  setDatabaseConnection: (connection: DatabaseConnection) => void
  setConnectionStatus: (isConnected: boolean) => void
  loadSessions: () => Promise<void>
  loadSessionMessages: (sessionId: string) => Promise<void>
  loadModels: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  initializeWebSocket: () => void
  disconnectWebSocket: () => void
  setIsProcessing: (value: boolean) => void
  setIsLoadingSessions: (value: boolean) => void
  setIsLoadingMessages: (value: boolean) => void
  setIsCreatingSession: (value: boolean) => void
}

const defaultModels: LLMModel[] = [
  {
    id: 'llama-3.3-70b-versatile',
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
      isLoadingSessions: false,
      isLoadingMessages: false,
      isCreatingSession: false,

      setIsProcessing: (value) => set({ isProcessing: value }),
      setIsLoadingSessions: (value) => set({ isLoadingSessions: value }),
      setIsLoadingMessages: (value) => set({ isLoadingMessages: value }),
      setIsCreatingSession: (value) => set({ isCreatingSession: value }),

      // Actions
      setCurrentSession: async (session) => {
        if (!session) {
          set({ currentSession: null })
          return
        }

        const normalizedSession = normalizeSession(session)
        set({ currentSession: normalizedSession })

        // Se a sessão não tem mensagens carregadas, carregar agora
        if (normalizedSession.mensagens.length === 0 && normalizedSession.messageCount && normalizedSession.messageCount > 0) {
          await get().loadSessionMessages(session.id)
        }
      },

      setSessions: (sessions) => {
        const normalizedSessions = (sessions || []).map(normalizeSession)
        set({ sessions: normalizedSessions })
      },

      addMessage: (messageData) => {
        const message: Message = {
          ...messageData,
          id: messageData.id || crypto.randomUUID(),
          timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date()
        }

        set((state) => {
          if (!state.currentSession) return state

          // Verificar se a mensagem já existe para evitar duplicatas
          const existingMessage = state.currentSession.mensagens.find(m => m.id === message.id)
          if (existingMessage) {
            console.log('⚠️ Mensagem já existe, ignorando duplicata:', message.id)
            return state
          }

          const updatedSession = {
            ...state.currentSession,
            mensagens: [...state.currentSession.mensagens, message],
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

          const updatedMessages = state.currentSession.mensagens.map(message =>
            message.id === messageId
              ? { ...message, evaluation }
              : message
          )

          const updatedSession = {
            ...state.currentSession,
            mensagens: updatedMessages,
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
          set({ isCreatingSession: true })
          console.log('🔄 Criando nova sessão...')

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

            console.log('✅ Nova sessão criada:', newSession.id)
          }
        } catch (error) {
          console.error('❌ Erro ao criar sessão:', error)
          // Fallback: criar sessão apenas localmente (temporário)
          const newSession: ChatSession = {
            id: `temp-${crypto.randomUUID()}`,
            titulo: title || `Nova Sessão ${new Date().toLocaleString()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            mensagens: [],
            modelo: get().selectedModel?.id || defaultModels[0].id
          }

          set((state) => ({
            currentSession: newSession,
            sessions: [newSession, ...state.sessions]
          }))

          console.log('⚠️ Sessão criada localmente como fallback:', newSession.id)
        } finally {
          set({ isCreatingSession: false })
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
          set({ isLoadingSessions: true })

          // Obter usuário do auth store
          const { useAuthStore } = await import('./auth-store')
          const user = useAuthStore.getState().user

          if (!user) {
            console.log('⚠️ Usuário não autenticado - não carregando sessões')
            return
          }

          console.log('🔄 Carregando sessões do usuário:', user.id, typeof user.id)

          // Buscar sessões do usuário na API (sem mensagens)
          const response = await apiService.get(`/sessions/user/${user.id}`)

          if (response.success && response.sessions) {
            const normalizedSessions = response.sessions.map(normalizeSessionSummary)
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
              const normalizedSessions = sessions.map(normalizeSessionSummary)
              set({ sessions: normalizedSessions })
              console.log('📦 Sessões carregadas do localStorage como fallback')
            } catch (parseError) {
              console.error('Erro ao carregar sessões do localStorage:', parseError)
              set({ sessions: [] })
            }
          } else {
            set({ sessions: [] })
          }
        } finally {
          set({ isLoadingSessions: false })
        }
      },

      loadSessionMessages: async (sessionId: string) => {
        try {
          set({ isLoadingMessages: true })
          console.log('🔄 Carregando mensagens da sessão com avaliações:', sessionId)

          const response = await apiService.getSessionMessages(sessionId)

          if (response.success && response.mensagens) {
            const messages = response.mensagens.map((msg: any) => ({
              ...normalizeMessage(msg),
              evaluation: msg.evaluation // Incluir avaliação se existir
            }))

            // Atualizar a sessão atual com as mensagens
            set((state) => {
              const updatedSessions = state.sessions.map(session =>
                session.id === sessionId
                  ? { ...session, mensagens: messages }
                  : session
              )

              const updatedCurrentSession = state.currentSession?.id === sessionId
                ? { ...state.currentSession, mensagens: messages }
                : state.currentSession

              return {
                sessions: updatedSessions,
                currentSession: updatedCurrentSession
              }
            })

            console.log('✅ Mensagens carregadas:', messages.length, 'mensagens')
            console.log('✅ Avaliações carregadas:', messages.filter((m: any) => m.evaluation).length, 'avaliações')
          } else {
            console.log('ℹ️ Nenhuma mensagem encontrada para a sessão')
          }
        } catch (error) {
          console.error('❌ Erro ao carregar mensagens:', error)

          // Adicionar mensagem de erro no chat
          get().addMessage({
            tipo: 'error',
            conteudo: 'Erro ao carregar mensagens da sessão. Tente novamente.'
          })
        } finally {
          set({ isLoadingMessages: false })
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

        // 1. PRIMEIRO: Adicionar mensagem do usuário imediatamente na UI
        const userMessage: Message = {
          id: `temp-${Date.now()}`, // ID temporário
          tipo: 'user',
          conteudo: content,
          timestamp: new Date()
        }

        // Adicionar mensagem do usuário na UI imediatamente
        get().addMessage(userMessage)

        // 2. SEGUNDO: Definir estado de processamento
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

          // 3. TERCEIRO: Enviar via WebSocket para processar resposta
          websocketService.sendMessage({
            sessionId: state.currentSession.id,
            message: content,
            model: state.selectedModel.id,
            userId: userId
          })
        } catch (error) {
          console.error('Erro ao enviar mensagem:', error)
          // Remover mensagem temporária em caso de erro
          set((state) => {
            if (!state.currentSession) return state

            const updatedMessages = state.currentSession.mensagens.filter(m => m.id !== userMessage.id)
            const updatedSession = {
              ...state.currentSession,
              mensagens: updatedMessages
            }

            return {
              ...state,
              currentSession: updatedSession,
              isProcessing: false
            }
          })
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

          // Se for mensagem do usuário, substituir mensagem temporária se existir
          if (message.tipo === 'user') {
            set((state) => {
              if (!state.currentSession) return state

              // Procurar mensagem temporária com mesmo conteúdo
              const tempMessageIndex = state.currentSession.mensagens.findIndex(m =>
                m.id.startsWith('temp-') &&
                m.tipo === 'user' &&
                m.conteudo === message.conteudo
              )

              if (tempMessageIndex !== -1) {
                // Substituir mensagem temporária pela real
                const updatedMessages = [...state.currentSession.mensagens]
                updatedMessages[tempMessageIndex] = normalizedMessage

                const updatedSession = {
                  ...state.currentSession,
                  mensagens: updatedMessages
                }

                return {
                  ...state,
                  currentSession: updatedSession
                }
              } else {
                // Se não encontrou temporária, adicionar normalmente
                return state
              }
            })
          } else {
            // Para mensagens do assistente, adicionar normalmente e parar processamento
            set({ isProcessing: false });
            get().addMessage(normalizedMessage)
          }
        })

        websocketService.onError((error: string) => {
          set({ isProcessing: false });
          console.error('❌ WebSocket error:', error)
          // Adiciona mensagem de erro na lista de mensagens do chat
          const addMessage = get().addMessage;
          addMessage({
            tipo: 'error',
            conteudo: typeof error === 'string' ? error : 'Erro de conexão com o WebSocket'
          });
        })

        websocketService.onMessageUpdated((message: Message) => {
          console.log('🔄 Mensagem atualizada via WebSocket:', message)
          const normalizedMessage = normalizeMessage(message)

          // Atualizar mensagem existente
          set((state) => {
            if (!state.currentSession) return state

            const updatedMessages = state.currentSession.mensagens.map(m =>
              m.id === message.id ? normalizedMessage : m
            )

            const updatedSession = {
              ...state.currentSession,
              mensagens: updatedMessages
            }

            const updatedSessions = state.sessions.map(session =>
              session.id === updatedSession.id ? updatedSession : session
            )

            return {
              currentSession: updatedSession,
              sessions: updatedSessions
            }
          })
        })

        websocketService.onQueryExecuting((status: string) => {
          console.log('⚡ Query sendo executada:', status)
          // Pode adicionar indicador de execução se necessário
        })

        websocketService.onQueryError((error: string) => {
          console.error('❌ Erro na execução da query:', error)
          get().addMessage({
            tipo: 'error',
            conteudo: `Erro na execução: ${error}`
          })
        })

        websocketService.onEvaluationUpdated((data: { messageId: string, evaluation: any }) => {
          console.log('📊 Avaliação atualizada via WebSocket:', data)
          get().updateMessageEvaluation(data.messageId, data.evaluation)
        })

        websocketService.onSessionTitleUpdated((data: { sessionId: string, title: string }) => {
          console.log('📝 Título da sessão atualizado via WebSocket:', data)

          set((state) => {
            // Atualizar sessão atual se for a mesma
            const updatedCurrentSession = state.currentSession?.id === data.sessionId
              ? { ...state.currentSession, titulo: data.title }
              : state.currentSession

            // Atualizar lista de sessões
            const updatedSessions = state.sessions.map(session =>
              session.id === data.sessionId
                ? { ...session, titulo: data.title }
                : session
            )

            return {
              ...state,
              currentSession: updatedCurrentSession,
              sessions: updatedSessions
            }
          })
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
