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
      })

      const userMessage = mapMessage(userMessageData);

      // Buscar mensagens anteriores da sessão para contexto
      const previousMessages = await prisma.mensagem.findMany({
        where: {
          sessaoId: actualSessionId,
          id: { not: userMessageData.id } // Excluir a mensagem atual
        },
        orderBy: { timestamp: 'asc' },
        take: 10 // Limitar a 10 mensagens anteriores para não sobrecarregar
      })

      const llmResponse: any = await this.llmService.handlePrompt({
        prompt: message,
        model,
        context: {
          schemaName: 'inep',
          conversationHistory: previousMessages
        }
      })
      console.log("🚀 ~ ChatService ~ processMessage ~ llmResponse:", llmResponse)

      if (!llmResponse.success) {
        // Criar mensagem de erro
        const errorMessageData = await this.addMessage(actualSessionId, {
          type: 'error',
          content: `Erro ao processar consulta: ${llmResponse.error}`
        })

        return {
          success: false,
          error: `Erro ao processar consulta: ${llmResponse.error}`,
          userMessage,
          assistantMessage: mapMessage(errorMessageData) || undefined
        }
      }

      // Criar mensagem de resposta do assistente
      const assistantMessageData = await this.addMessage(actualSessionId, {
        type: 'assistant',
        content: llmResponse.content
      }, {...llmResponse})

      const assistantMessage = mapMessage(assistantMessageData);

      return {
        success: true,
        userMessage,
        assistantMessage: assistantMessage || undefined,
        session
      }
    } catch (error: any) {
      console.error("🚀 ~ ChatService ~ processMessage ~ error:", error)
      return {
        success: false,
        error: `Erro interno: ${error.message}`
      }
    }
  }

  async processQuery(
    messageId: string
  ): Promise<{
    success: boolean
    sessionId?: string
    assistantMessage?: Message
    error?: string
  }> {
    try {
      console.log(`🔍 Processando query para messageId: ${messageId}`)

      const mensagem = await prisma.mensagem.findUnique({
        where: {id: messageId}
      })

      if(!mensagem || !mensagem?.sqlQuery){
        console.log('❌ Mensagem ou SQL Query não encontrada:', { mensagem: !!mensagem, sqlQuery: mensagem?.sqlQuery })
         return {
          success: false,
          sessionId: mensagem?.sessaoId,
          error: 'Mensagem SQL Query não encontrada'
        }
      }

      console.log(`🔍 SQL Query encontrada: ${mensagem.sqlQuery}`)

      const dbResponse = await this.queryService.executeQuery(mensagem.sqlQuery);
      console.log("🚀 ~ ChatService ~ processQuery ~ dbResponse:", dbResponse)

      if (!dbResponse.success) {
        // Criar mensagem de erro
        const errorMessageData = await this.addMessage(mensagem.sessaoId, {
          type: 'error',
          content: `Erro ao processar consulta: ${dbResponse.error}`
        })

        return {
          success: false,
          error: `Erro ao processar consulta: ${dbResponse.error}`,
          assistantMessage: mapMessage(errorMessageData) || undefined,
          sessionId: mensagem.sessaoId
        }
      }

      const assistantMessageData = await this.updateMessage(mensagem.id, {
        queryResult: dbResponse
      })

      const assistantMessage = mapMessage(assistantMessageData);

      return {
        success: true,
        assistantMessage,
        sessionId: mensagem.sessaoId
      };

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
    data: any = {}
  ) {
    const {
      sqlQuery,
      queryResult,
      explanation,
      reverseTranslation,
      hasExplanation
    } = data;

    return prisma.mensagem.create({
      data: {
        sessaoId,
        tipo: message.type,
        conteudo: message.content,
        timestamp: new Date(),
        sqlQuery: sqlQuery,
        queryResult: queryResult as any,
        hasExplanation: hasExplanation || null,
        explanation: explanation || null,
        reverseTranslation: reverseTranslation || null
      }
    });
  }

  public async updateMessage(id: string, updateData: {
  sqlQuery?: string;
  queryResult?: any;
  hasExplanation?: boolean | null;
  explanation?: string | null;
  reverseTranslation?: string | null;
  }) {
    return prisma.mensagem.update({
      data: updateData,
      where: { id }
    });
  }
}
