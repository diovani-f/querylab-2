import axios from 'axios'

export interface OpenRouterRequest {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface OpenRouterResponse {
  success: boolean
  content?: string
  model?: string
  error?: string
  processingTime: number
}

export class OpenRouterService {
  private static instance: OpenRouterService
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'
  private defaultModel = 'deepseek/deepseek-chat-v3-0324'

  private constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY!
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY é obrigatória! Verifique o arquivo .env')
    }
  }

  static getInstance(): OpenRouterService {
    if (!OpenRouterService.instance) {
      OpenRouterService.instance = new OpenRouterService()
    }
    return OpenRouterService.instance
  }

  async generateResponse(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    const startTime = Date.now()
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: request.model || this.defaultModel,
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature ?? 0.1,
          max_tokens: request.maxTokens ?? 2000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://querylab.app',
            'X-Title': 'QueryLab'
          },
          timeout: 90000
        }
      )

      const content = response.data.choices?.[0]?.message?.content
      if (!content) {
        return { success: false, error: 'Resposta vazia do OpenRouter', processingTime: Date.now() - startTime }
      }

      return {
        success: true,
        content,
        model: response.data.model || this.defaultModel,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.error?.message || error.message
        return { success: false, error: msg, processingTime }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido', processingTime }
    }
  }
}
