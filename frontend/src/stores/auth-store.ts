import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User, UserLogin, UserRegistration, AuthResponse } from '@/types'
import { sanitizeError, logError } from '@/lib/error-handler'

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
            // Limpar qualquer token antigo antes do login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('querylab-auth')
            }

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

              // Forçar persistência imediata no localStorage
              if (typeof window !== 'undefined') {
                const stateToSave = {
                  state: {
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true
                  },
                  version: 0
                }
                localStorage.setItem('querylab-auth', JSON.stringify(stateToSave))
              }

              // Aguardar a persistência antes de carregar histórico
              setTimeout(() => {
                get().loadUserHistory().catch(() => {
                  // Falha ao carregar histórico - não crítico
                })
              }, 1000)
            } else {
              set({
                isLoading: false,
                error: data.error || 'Erro no login',
              })
            }

            return data
          } catch (error) {
            const errorInfo = sanitizeError(error, 'auth')
            logError(error, 'login')

            set({
              isLoading: false,
              error: errorInfo.userMessage,
            })
            return {
              success: false,
              error: errorInfo.userMessage,
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
                get().loadUserHistory().catch(() => {
                  // Falha ao carregar histórico - não crítico
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
            const errorInfo = sanitizeError(error, 'auth')
            logError(error, 'register')

            set({
              isLoading: false,
              error: errorInfo.userMessage,
            })
            return {
              success: false,
              error: errorInfo.userMessage,
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
            // Erro ao fazer logout no servidor - continuar com logout local
          } finally {
            // Limpar estado do Zustand
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              error: null,
            })

            // Limpar localStorage manualmente
            if (typeof window !== 'undefined') {
              localStorage.removeItem('querylab-auth')
            }
          }
        },

        checkAuth: async (): Promise<void> => {
          const { token, isCheckingAuth } = get()

          // Evitar múltiplas verificações simultâneas
          if (isCheckingAuth) {
            return
          }

          if (!token) {
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
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })

            if (response.ok) {
              const data = await response.json()

              if (data.success && data.user) {
                set({
                  user: data.user,
                  isAuthenticated: true,
                  isLoading: false,
                  isCheckingAuth: false,
                })

                // Carregar histórico do usuário após autenticação (não bloquear se falhar)
                get().loadUserHistory().catch(() => {
                  // Falha ao carregar histórico - não crítico
                })
              } else {
                // Token inválido - limpar estado
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
            logError(error, 'checkAuth')
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
            return
          }

          // Carregar sessões do usuário usando o método do app-store
          try {
            const { useAppStore } = await import('./app-store')
            await useAppStore.getState().loadSessions()
          } catch (sessionsError) {
            // Falha ao carregar sessões - não crítico
          }

          // Carregar histórico de consultas (não falhar se der erro)
          try {
            const historyResponse = await fetch(`${API_BASE_URL}/history/user/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })

            if (historyResponse.ok) {
              await historyResponse.json()
              // Histórico carregado com sucesso
            }
          } catch (historyError) {
            // Falha ao carregar histórico - não crítico
          }

          // Carregar favoritos (não falhar se der erro)
          try {
            const favoritesResponse = await fetch(`${API_BASE_URL}/sessions/favorites/user/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })

            if (favoritesResponse.ok) {
              await favoritesResponse.json()
              // Favoritos carregados com sucesso
            }
          } catch (favoritesError) {
            // Falha ao carregar favoritos - não crítico
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
          // Zustand rehydrated - não verificar automaticamente aqui para evitar loop
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
