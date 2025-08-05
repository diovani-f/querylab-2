import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User, UserLogin, UserRegistration, AuthResponse } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isCheckingAuth: boolean
}

interface AuthActions {
  login: (credentials: UserLogin) => Promise<AuthResponse>
  register: (userData: UserRegistration) => Promise<AuthResponse>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  changePassword: (senhaAtual: string, novaSenha: string) => Promise<void>
  loadUserHistory: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

interface AuthStore extends AuthState, AuthActions {}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true, // Começar com loading true para evitar flash
        error: null,
        isCheckingAuth: false,

        // Actions
        login: async (credentials: UserLogin): Promise<AuthResponse> => {
          set({ isLoading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(credentials),
            })

            const data: AuthResponse = await response.json()

            if (data.success && data.user && data.token) {
              set({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })

              // Carregar histórico do usuário após login (não bloquear se falhar)
              setTimeout(() => {
                get().loadUserHistory().catch(error => {
                  console.warn('⚠️ Falha ao carregar histórico (não crítico):', error.message)
                })
              }, 500)
            } else {
              set({
                isLoading: false,
                error: data.error || 'Erro no login',
              })
            }

            return data
          } catch (error) {
            const errorMessage = 'Erro de conexão com o servidor'
            set({
              isLoading: false,
              error: errorMessage,
            })
            return {
              success: false,
              error: errorMessage,
            }
          }
        },

        register: async (userData: UserRegistration): Promise<AuthResponse> => {
          set({ isLoading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userData),
            })

            const data: AuthResponse = await response.json()

            if (data.success && data.user && data.token) {
              set({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })

              // Carregar histórico do usuário após registro (não bloquear se falhar)
              setTimeout(() => {
                get().loadUserHistory().catch(error => {
                  console.warn('⚠️ Falha ao carregar histórico (não crítico):', error.message)
                })
              }, 500)
            } else {
              set({
                isLoading: false,
                error: data.error || 'Erro no registro',
              })
            }

            return data
          } catch (error) {
            const errorMessage = 'Erro de conexão com o servidor'
            set({
              isLoading: false,
              error: errorMessage,
            })
            return {
              success: false,
              error: errorMessage,
            }
          }
        },

        logout: async (): Promise<void> => {
          const { token } = get()

          try {
            if (token) {
              await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
            }
          } catch (error) {
            console.error('Erro ao fazer logout no servidor:', error)
          } finally {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              error: null,
            })
          }
        },

        checkAuth: async (): Promise<void> => {
          const { token, isCheckingAuth } = get()

          // Evitar múltiplas verificações simultâneas
          if (isCheckingAuth) {
            console.log('⏳ Verificação de auth já em andamento, ignorando...')
            return
          }

          console.log('🔍 Verificando autenticação...', { hasToken: !!token })

          if (!token) {
            console.log('❌ Nenhum token encontrado')
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isCheckingAuth: false
            })
            return
          }

          set({ isLoading: true, isCheckingAuth: true })

          try {
            console.log('📡 Fazendo requisição para /auth/me...')
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })

            console.log('📡 Resposta recebida:', { status: response.status, ok: response.ok })

            if (response.ok) {
              const data = await response.json()
              console.log('✅ Dados da resposta:', { success: data.success, hasUser: !!data.user })

              if (data.success && data.user) {
                set({
                  user: data.user,
                  isAuthenticated: true,
                  isLoading: false,
                  isCheckingAuth: false,
                })

                console.log('✅ Usuário autenticado com sucesso:', data.user.nome)

                // Carregar histórico do usuário após autenticação (não bloquear se falhar)
                get().loadUserHistory().catch(error => {
                  console.warn('⚠️ Falha ao carregar histórico (não crítico):', error.message)
                })
              } else {
                console.log('❌ Token inválido - dados inválidos')
                // Token inválido - limpar estado e redirecionar
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                  isLoading: false,
                  isCheckingAuth: false,
                })

                // Redirecionar para login se estiver no browser
                if (typeof window !== 'undefined') {
                  window.location.href = '/login'
                }
              }
            } else {
              console.log('❌ Token inválido ou expirado - status:', response.status)
              // Token inválido ou expirado - limpar estado e redirecionar
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                isCheckingAuth: false,
              })

              // Redirecionar para login se estiver no browser
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
            }
          } catch (error) {
            console.error('❌ Erro ao verificar autenticação:', error)
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              isCheckingAuth: false,
            })

            // Se o erro for relacionado a token inválido, redirecionar
            if (error instanceof Error && error.message.includes('Token inválido')) {
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
            }
          }
        },

        updateProfile: async (updates: Partial<User>): Promise<void> => {
          const { token } = get()

          if (!token) {
            throw new Error('Usuário não autenticado')
          }

          set({ isLoading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updates),
            })

            // Verificar se é erro de autenticação
            if (response.status === 401 || response.status === 403) {
              console.log('🔒 Token inválido ao atualizar perfil - redirecionando para login')
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              })
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
              throw new Error('Token inválido ou expirado')
            }

            const data = await response.json()

            if (data.success && data.user) {
              set({
                user: data.user,
                isLoading: false,
              })
            } else {
              set({
                isLoading: false,
                error: data.error || 'Erro ao atualizar perfil',
              })
              throw new Error(data.error || 'Erro ao atualizar perfil')
            }
          } catch (error) {
            set({ isLoading: false })
            throw error
          }
        },

        changePassword: async (senhaAtual: string, novaSenha: string): Promise<void> => {
          const { token } = get()

          if (!token) {
            throw new Error('Usuário não autenticado')
          }

          set({ isLoading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ senhaAtual, novaSenha }),
            })

            // Verificar se é erro de autenticação
            if (response.status === 401 || response.status === 403) {
              console.log('🔒 Token inválido ao alterar senha - redirecionando para login')
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              })
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
              throw new Error('Token inválido ou expirado')
            }

            const data = await response.json()

            if (data.success) {
              set({ isLoading: false })
            } else {
              set({
                isLoading: false,
                error: data.error || 'Erro ao alterar senha',
              })
              throw new Error(data.error || 'Erro ao alterar senha')
            }
          } catch (error) {
            set({ isLoading: false })
            throw error
          }
        },

        loadUserHistory: async (): Promise<void> => {
          const { user, token } = get()

          if (!user || !token) {
            console.log('⚠️ Usuário ou token não disponível para carregar histórico')
            return
          }

          console.log('🔄 Carregando dados do usuário:', user.id, 'API:', API_BASE_URL)

          // Carregar sessões do usuário usando o método do app-store
          try {
            const { useAppStore } = await import('./app-store')
            await useAppStore.getState().loadSessions()
            console.log('✅ Sessões carregadas via app-store')
          } catch (sessionsError) {
            console.warn('⚠️ Falha ao carregar sessões:', sessionsError instanceof Error ? sessionsError.message : String(sessionsError))
          }

          // Carregar histórico de consultas (não falhar se der erro)
          try {
            const historyResponse = await fetch(`${API_BASE_URL}/history/user/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })

            if (historyResponse.ok) {
              const historyData = await historyResponse.json()
              if (historyData.success && historyData.history && Array.isArray(historyData.history)) {
                console.log('✅ Histórico carregado:', historyData.history.length, 'consultas')
              } else {
                console.log('ℹ️ Nenhum histórico encontrado ou formato inválido')
              }
            } else {
              console.log('⚠️ Erro ao carregar histórico:', historyResponse.status)
            }
          } catch (historyError) {
            console.warn('⚠️ Falha ao carregar histórico:', historyError instanceof Error ? historyError.message : String(historyError))
          }

          // Carregar favoritos (não falhar se der erro)
          try {
            const favoritesResponse = await fetch(`${API_BASE_URL}/favorites/user/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })

            if (favoritesResponse.ok) {
              const favoritesData = await favoritesResponse.json()
              if (favoritesData.success && favoritesData.favorites && Array.isArray(favoritesData.favorites)) {
                console.log('✅ Favoritos carregados:', favoritesData.favorites.length, 'itens')
              } else {
                console.log('ℹ️ Nenhum favorito encontrado ou formato inválido')
              }
            } else {
              console.log('⚠️ Erro ao carregar favoritos:', favoritesResponse.status)
            }
          } catch (favoritesError) {
            console.warn('⚠️ Falha ao carregar favoritos:', favoritesError instanceof Error ? favoritesError.message : String(favoritesError))
          }
        },

        clearError: () => set({ error: null }),

        setLoading: (loading: boolean) => set({ isLoading: loading }),
      }),
      {
        name: 'querylab-auth',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
          // Não persistir isLoading, isCheckingAuth e error
        }),
        onRehydrateStorage: () => (state) => {
          console.log('🔄 Zustand rehydrated:', {
            hasToken: !!state?.token,
            isAuthenticated: state?.isAuthenticated,
            hasUser: !!state?.user
          })
          // Não verificar automaticamente aqui para evitar loop
          // A verificação será feita pelos componentes quando necessário
          if (state) {
            state.setLoading(false)
          }
        },
      }
    ),
    {
      name: 'querylab-auth-store',
    }
  )
)
