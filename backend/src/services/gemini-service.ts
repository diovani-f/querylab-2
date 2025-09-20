import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { LLMRequest, LLMResponse } from '../types'

export interface GeminiConfig {
  model: string
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
}

export class GeminiService {
  private static instance: GeminiService
  private genAI: GoogleGenerativeAI
  private availableModels: Map<string, GenerativeModel> = new Map()

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY é obrigatória! Verifique o arquivo .env')
    }

    this.genAI = new GoogleGenerativeAI(apiKey)
    this.initializeModels()
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService()
    }
    return GeminiService.instance
  }

  private initializeModels(): void {
    // Modelos Gemini Flash-Lite (otimizados para maior RPD)
    const models = [
      'gemini-2.5-flash-lite',    // Gemini 2.5 Flash-Lite (1000 RPD) - PRINCIPAL
      'gemini-2.0-flash-lite',    // Gemini 2.0 Flash-Lite (200 RPD) - FALLBACK
    ]

    models.forEach(modelName => {
      const model = this.genAI.getGenerativeModel({ model: modelName })
      this.availableModels.set(modelName, model)
    })
  }

  /**
   * Gera resposta usando sistema de fallback interno entre modelos Gemini
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, context } = request

    // Ordem de prioridade dos modelos Flash-Lite
    const modelPriority = [
      'gemini-2.5-flash-lite',  // 1000 RPD - PRINCIPAL
      'gemini-2.0-flash-lite',  // 200 RPD - FALLBACK
    ]

    let lastError: any = null

    // Tentar cada modelo em ordem de prioridade
    for (const modelName of modelPriority) {
      try {
        console.log(`🔄 Tentando Gemini modelo: ${modelName}`)

        const geminiModel = this.availableModels.get(modelName)
        if (!geminiModel) {
          console.warn(`⚠️ Modelo ${modelName} não encontrado, pulando...`)
          continue
        }

        // Construir mensagens para o contexto de conversa
        const conversationMessages = this.buildConversationMessages(prompt, context?.conversationHistory || [])

        // Configurar parâmetros de geração
        const generationConfig = this.getGenerationConfig(modelName)

        // Gerar resposta
        const result = await geminiModel.generateContent({
          contents: conversationMessages,
          generationConfig
        })

        const response = result.response
        const text = response.text()

        if (!text) {
          throw new Error('Resposta vazia do modelo Gemini')
        }

        console.log(`✅ Resposta bem-sucedida do Gemini (${modelName})`)
        return {
          success: true,
          content: text,
          model: modelName,
          provider: 'gemini',
          usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata?.totalTokenCount || 0
          }
        }

      } catch (error: any) {
        lastError = error
        const isRateLimit = this.isRateLimitError(error)

        if (isRateLimit) {
          console.warn(`⚠️ Rate limit no modelo ${modelName}, tentando próximo modelo...`)
        } else {
          console.warn(`⚠️ Erro no modelo ${modelName}: ${error.message}, tentando próximo modelo...`)
        }

        // Se não é rate limit e é um erro crítico, pode tentar próximo modelo
        // Se é rate limit, definitivamente tentar próximo modelo
        continue
      }
    }

    // Se chegou aqui, todos os modelos falharam
    console.error('❌ Todos os modelos Gemini falharam')
    return {
      success: false,
      error: `Todos os modelos Gemini falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`,
      model: 'gemini-2.5-flash-lite',
      provider: 'gemini',
      isRateLimit: this.isRateLimitError(lastError)
    }
  }

  /**
   * Constrói mensagens para o contexto de conversa
   */
  private buildConversationMessages(prompt: string, conversationHistory: any[]): any[] {
    const messages: any[] = []

    // Adicionar histórico da conversa
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        messages.push({
          role: 'user',
          parts: [{ text: msg.content }]
        })
      } else if (msg.role === 'assistant') {
        messages.push({
          role: 'model',
          parts: [{ text: msg.content }]
        })
      }
    })

    // Adicionar prompt atual
    messages.push({
      role: 'user',
      parts: [{ text: prompt }]
    })

    return messages
  }

  /**
   * Obtém configuração de geração otimizada para cada modelo
   */
  private getGenerationConfig(model: string): any {
    const baseConfig = {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192
    }

    switch (model) {
      case 'gemini-2.5-flash-lite':
        return {
          ...baseConfig,
          temperature: 0.3, // Mais conservador para SQL
          maxOutputTokens: 8192
        }

      case 'gemini-2.0-flash-lite':
        return {
          ...baseConfig,
          temperature: 0.4, // Ligeiramente mais conservador
          maxOutputTokens: 8192
        }

      default:
        return baseConfig
    }
  }

  /**
   * Verifica se o erro é de rate limit
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status

    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('too many requests') ||
      errorCode === 429 ||
      errorCode === 'RATE_LIMIT_EXCEEDED'
    )
  }

  /**
   * Obtém lista de modelos disponíveis
   */
  getAvailableModels(): string[] {
    return Array.from(this.availableModels.keys())
  }

  /**
   * Verifica se um modelo está disponível
   */
  isModelAvailable(model: string): boolean {
    return this.availableModels.has(model)
  }
}
