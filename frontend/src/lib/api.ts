import { ChatRequest, ChatResponse } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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
