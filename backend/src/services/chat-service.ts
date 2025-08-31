import { Message, ChatSession, LLMModel, QueryResult } from '../types'
import { LLMService } from './llm-service'
import { QueryService } from './query-service'
import { PrismaClient } from '@prisma/client'
import { Mensagem, Sessao as PrismaSessao, LLMModel as PrismaLLMModel } from '@prisma/client'
import { SessionService } from './session-service'

const prisma = new PrismaClient()

// Função de mapeamento para converter o tipo do Prisma para a interface local
function mapMessage(msg: Mensagem): Message {
  return {
    id: msg.id,
    tipo: msg.tipo,
    conteudo: msg.conteudo,
    timestamp: msg.timestamp,
    sqlQuery: msg.sqlQuery,
    queryResult: msg.queryResult as QueryResult,
    hasExplanation: msg.hasExplanation,
    explanation: msg.explanation,
    reverseTranslation: msg.reverseTranslation
  }
}

// Função de mapeamento para converter o tipo do Prisma para a interface local
function mapSession(session: PrismaSessao & {
  mensagens: Mensagem[],
  modelo: PrismaLLMModel
}): ChatSession {
  return {
    id: session.id,
    titulo: session.titulo,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    mensagens: session.mensagens.map(mapMessage),
    modelo: {
      id: session.modelo.id,
      name: session.modelo.name,
      description: session.modelo.description,
      provider: session.modelo.provider,
      maxTokens: session.modelo.maxTokens,
      isDefault: session.modelo.isDefault
    }
  }
}

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
    model: string
    userId?: string
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
      let sessionData = await this.sessionService.getSession(sessionId)
      if (!sessionData && userId) {
        // Criar nova sessão no banco se não existir
        sessionData = await this.sessionService.createSession(
          userId,
          `Sessão ${new Date().toLocaleString('pt-BR')}`,
          model
        )
      }

      if (!sessionData) {
        return {
          success: false,
          error: 'Sessão não encontrada e usuário não identificado'
        }
      }

      // Mapear a sessão do Prisma para o tipo ChatSession
      const session = mapSession(sessionData);

      // Usar o ID da sessão
      const actualSessionId = session.id

      // Adicionar mensagem do usuário no banco
      const userMessageData = await this.addMessage(actualSessionId, {
        type: 'user',
        content: message
      }, null, null)

      const userMessage = mapMessage(userMessageData);

      const llmResponse: any = await this.llmService.handlePrompt({
        prompt: message,
        model,
        context: { schemaName: 'inep' }
      })

      if (!llmResponse.success) {
        // Criar mensagem de erro
        const errorMessageData = await this.addMessage(actualSessionId, {
          type: 'error',
          content: `Erro ao processar consulta: ${llmResponse.error}`
        }, null, null)

        return {
          success: false,
          error: `Erro ao processar consulta: ${llmResponse.error}`,
          userMessage,
          assistantMessage: mapMessage(errorMessageData) || undefined
        }
      }

      let finalContent = ''
      let sqlQuery: string | null = null
      let queryResult: QueryResult | null = null
      let hasExplanation: boolean | null = false
      let explanation: string | null = null
      let reverseTranslation: string | null = null

      if (llmResponse.explanation && !llmResponse.sql) {
        finalContent = llmResponse.explanation
        hasExplanation = true
        explanation = llmResponse.explanation
        reverseTranslation = llmResponse.reverseTranslation || null
      } else if (llmResponse.sql) {
        sqlQuery = llmResponse.sql
        hasExplanation = false // Se tem SQL, não é só uma explicação textual
        explanation = null // A explicação é tratada de forma diferente ou não existe
        reverseTranslation = llmResponse.reverseTranslation || null

        const queryResultObj = await this.queryService.executeQuery(llmResponse.sql)
        queryResult = queryResultObj

        if (!queryResult.success) {
          finalContent = `Erro ao executar consulta: ${queryResult.error}`
        } else {
          finalContent = JSON.stringify(queryResult.data, null, 2)
        }
      }

      // Criar mensagem de resposta do assistente
      const assistantMessageData = await this.addMessage(actualSessionId, {
        type: 'assistant',
        content: finalContent
      }, sqlQuery, queryResult, hasExplanation, explanation, reverseTranslation)

      const assistantMessage = mapMessage(assistantMessageData);

      return {
        success: true,
        userMessage,
        assistantMessage: assistantMessage || undefined,
        session
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erro interno: ${error.message}`
      }
    }
  }

  /**
   * Adiciona mensagem no banco via Prisma
   */
  public async addMessage(
    sessaoId: string,
    message: { type: string; content: string },
    sqlQuery: string | null,
    queryResult: QueryResult | null,
    hasExplanation: boolean | null = null,
    explanation: string | null = null,
    reverseTranslation: string | null = null
  ) {
    return prisma.mensagem.create({
      data: {
        sessaoId,
        tipo: message.type,
        conteudo: message.content,
        timestamp: new Date(),
        sqlQuery,
        queryResult: queryResult as any, // Adicionado 'as any' para forçar a compatibilidade do tipo JSONValue
        hasExplanation,
        explanation,
        reverseTranslation
      }
    })
  }
}
