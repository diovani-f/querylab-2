import { Message, ChatSession } from '../types'
import { SessionService } from './session-service'
import { LLMService } from './llm-service'
import { QueryService } from './query-service'

const JSON_SERVER_URL = process.env.JSON_SERVER_URL || 'http://localhost:3001'

/**
 * Serviço responsável por processar mensagens de chat
 * Centraliza a lógica que estava duplicada entre WebSocket handlers e REST routes
 */
export class ChatService {
  private static instance: ChatService
  private sessionService: SessionService
  private llmService: LLMService
  private queryService: QueryService

  private constructor() {
    this.sessionService = SessionService.getInstance()
    this.llmService = LLMService.getInstance()
    this.queryService = QueryService.getInstance()
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  /**
   * Processa uma mensagem de chat completa
   */
  async processMessage(params: {
    sessionId: string
    message: string
    model?: string
    userId?: number | string
  }): Promise<{
    success: boolean
    userMessage?: Message
    assistantMessage?: Message
    session?: ChatSession
    error?: string
  }> {
    try {
      const { sessionId, message, model, userId } = params

      // Verificar se a sessão existe no banco de dados
      let session = await this.getSessionFromDatabase(sessionId)
      if (!session && userId) {
        // Criar nova sessão no banco se não existir
        session = await this.createSessionInDatabase(userId, `Sessão ${new Date().toLocaleString('pt-BR')}`, model)
      }

      if (!session) {
        return {
          success: false,
          error: 'Sessão não encontrada e usuário não identificado'
        }
      }

      // Usar o ID da sessão
      const actualSessionId = session.id

      // Adicionar mensagem do usuário no banco
      const userMessage = await this.sessionService.addMessage(actualSessionId, {
        type: 'user',
        content: message
      })

      if (!userMessage) {
        return {
          success: false,
          error: 'Erro ao salvar mensagem do usuário'
        }
      }

      // Gerar SQL usando LLM real
      const llmResponse = await this.llmService.generateSQL({
        prompt: message,
        model: model || 'llama3-70b-8192',
        context: { schema: 'universidades' }
      })

      if (!llmResponse.success) {
        // Criar mensagem de erro
        const errorMessage = await this.sessionService.addMessage(actualSessionId, {
          type: 'error',
          content: `Erro ao processar consulta: ${llmResponse.error}`
        })

        return {
          success: false,
          error: `Erro ao processar consulta: ${llmResponse.error}`,
          userMessage,
          assistantMessage: errorMessage || undefined
        }
      }

      // Verificar se é uma explicação ou SQL
      if (llmResponse.explanation && !llmResponse.sqlQuery) {
        // É uma explicação (não uma consulta SQL)
        const assistantMessage = await this.sessionService.addMessage(actualSessionId, {
          type: 'assistant',
          content: llmResponse.explanation
        })

        return {
          success: true,
          userMessage,
          assistantMessage: assistantMessage || undefined,
          session: this.sessionService.getSession(actualSessionId) || undefined
        }
      }

      // Executar SQL gerado no banco de dados
      const queryResult = await this.queryService.executeQuery(llmResponse.sqlQuery!)

      // Gerar explicação textual dos resultados usando LLM
      const explanationResponse = await this.llmService.generateExplanation({
        query: llmResponse.sqlQuery!,
        result: queryResult,
        originalPrompt: message
      })

      // Usar a explicação gerada pela LLM como conteúdo principal
      const responseContent = explanationResponse.success && explanationResponse.explanation
        ? explanationResponse.explanation
        : `Consulta executada com sucesso. Encontrados ${queryResult.rowCount} resultado(s).`

      // Adicionar mensagem de resposta no banco com dados técnicos
      const assistantMessage = await this.sessionService.addMessage(actualSessionId, {
        type: 'assistant',
        content: responseContent,
        sqlQuery: llmResponse.sqlQuery,
        queryResult,
        hasExplanation: true // Flag para indicar que tem explicação textual
      })

      // Salvar no histórico também
      if (userId && llmResponse.sqlQuery) {
        await this.saveToHistory(userId, actualSessionId, message, llmResponse.sqlQuery, queryResult, model || 'llama3-70b-8192')
      }

      return {
        success: true,
        userMessage,
        assistantMessage: assistantMessage || undefined,
        session: this.sessionService.getSession(actualSessionId) || undefined
      }

    } catch (error) {
      console.error('Erro ao processar mensagem:', error)
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  /**
   * Busca sessão no banco de dados
   */
  private async getSessionFromDatabase(sessionId: string): Promise<ChatSession | null> {
    await this.sessionService.loadSessions() // Garantir que as sessões estão carregadas
    return this.sessionService.getSession(sessionId)
  }

  /**
   * Cria nova sessão no banco de dados
   */
  private async createSessionInDatabase(userId: number | string, title: string, model?: string): Promise<ChatSession | null> {
    const modelObj = {
      id: model || 'llama3-70b-8192',
      name: 'Llama 3 70B',
      description: 'Modelo padrão para consultas SQL',
      provider: 'groq' as const,
      maxTokens: 8192,
      isDefault: true
    }

    try {
      return await this.sessionService.createSession(title, modelObj, userId)
    } catch (error) {
      console.error('Erro ao criar sessão:', error)
      return null
    }
  }

  /**
   * Salva consulta no histórico
   */
  private async saveToHistory(userId: number | string, sessionId: string, consulta: string, sqlGerado: string, resultado: any, modeloUsado: string): Promise<void> {
    try {
      const historyItem = {
        usuario_id: userId,
        sessao_id: sessionId,
        consulta,
        sql_gerado: sqlGerado,
        resultado,
        modelo_usado: modeloUsado,
        timestamp: new Date().toISOString(),
        is_favorito: false,
        tags: []
      }

      await fetch(`${JSON_SERVER_URL}/historico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyItem)
      })
    } catch (error) {
      console.error('Erro ao salvar no histórico:', error)
    }
  }
}
