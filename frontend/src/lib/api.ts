import { ChatRequest, ChatResponse } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Tentar obter o token do localStorage
    if (typeof window !== 'undefined') {
      try {
        const authData = localStorage.getItem('querylab-auth')
        if (authData) {
          const parsed = JSON.parse(authData)
          if (parsed.state?.token) {
            headers['Authorization'] = `Bearer ${parsed.state.token}`
          }
        }
      } catch (error) {
        console.warn('Erro ao obter token de autenticação:', error)
      }
    }

    return headers
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getAuthHeaders()
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  async put(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  async delete(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Health check
  async healthCheck() {
    return this.get('/health')
  }

  // Database health check
  async databaseHealthCheck() {
    return this.get('/health/database')
  }

  // Send chat message
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.post('/chat/message', request)
  }

  // Get session
  async getSession(sessionId: string) {
    return this.get(`/chat/sessions/${sessionId}`)
  }
}

export const apiService = new ApiService()
