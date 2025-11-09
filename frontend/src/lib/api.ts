import { ChatRequest, ChatResponse } from '@/types'
import { sanitizeError, logError } from './error-handler'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      try {
        let token: string | null = null;

        // Obter token do localStorage
        const authData = localStorage.getItem('querylab-auth');
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            token = parsed.state?.token;
          } catch {
            // Erro ao parsear - continuar sem token
          }
        }



        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        // Erro ao obter token - continuar sem autenticação
      }
    }

    return headers;
  }

  private async handleResponse(response: Response) {
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('querylab-auth');
        window.location.href = '/login';
      }
      throw new Error('Token inválido ou expirado. Redirecionando para o login...');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const originalError = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;

      // Log do erro original para debug
      logError(originalError, 'api_request', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData
      });

      // Sanitizar erro para o usuário
      const errorInfo = sanitizeError(originalError, 'server');
      throw new Error(errorInfo.userMessage);
    }

    return response.json();
  }

  private async request(endpoint: string, options: RequestInit) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Health check (rota pública)
  async healthCheck() {
    return this.getPublic('/health')
  }

  // Database health check (rota pública)
  async databaseHealthCheck() {
    return this.getPublic('/health/database')
  }

  // Send chat message
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.post('/chat/message', request)
  }

  // Get session
  async getSession(sessionId: string) {
    return this.get(`/chat/sessions/${sessionId}`)
  }

  // Evaluation methods
  async getEvaluationCriteria() {
    return this.get('/evaluation/criteria')
  }

  async getEvaluationByMessage(messageId: string) {
    return this.get(`/evaluation/message/${messageId}`)
  }

  async getSessionMessages(sessionId: string) {
    return this.get(`/sessions/${sessionId}/messages`)
  }

  async saveEvaluation(evaluationData: any) {
    return this.post('/evaluation/evaluate', evaluationData)
  }

  async getEvaluationSummary(sessionId?: string) {
    const endpoint = sessionId ? `/evaluation/summary/${sessionId}` : '/evaluation/summary'
    return this.get(endpoint)
  }

  async executeQuery(executionQueryData: any) {
    return this.patch('/chat/execute', executionQueryData)
  }

  // Salvar resultado paralelo selecionado
  async saveParallelResult(sessionId: string, result: any) {
    return this.post('/chat/save-parallel-result', { sessionId, result })
  }

  // Método para buscar status dos serviços (sem autenticação)
  async getSystemStatus() {
    return this.getPublic('/health/status')
  }

  // Método GET sem autenticação (para rotas públicas)
  private async getPublic(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

export const apiService = new ApiService()
