import { Message, ChatSession, LLMModel } from '../types'
import { LLMService } from './llm-service'
import { QueryService } from './query-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Serviço responsável por processar mensagens de chat
 * Centraliza a lógica que estava duplicada entre WebSocket handlers e REST routes
 */
export class ChatService {
  private static instance: ChatService
  private llmService: LLMService
  private queryService: QueryService

  private constructor() {
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
    model: LLMModel
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
        session = await this.createSessionInDatabase(
          String(userId),
          `Sessão ${new Date().toLocaleString('pt-BR')}`,
          model
        )
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
      const userMessage = await this.addMessage(actualSessionId, {
        type: 'user',
        content: message
      })

      if (!userMessage) {
        return {
          success: false,
          error: 'Erro ao salvar mensagem do usuário'
        }
      }

      const llmResponse: any = await this.llmService.generateSQL({
        prompt: message,
        model,
        context: { schemaName: 'INEP' }
      })

      if (!llmResponse.success) {
        // Criar mensagem de erro
        const errorMessage = await this.addMessage(actualSessionId, {
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

      let finalContent = ''
      if (llmResponse.explanation && !llmResponse.sql) {
        finalContent = llmResponse.explanation
      } else if (llmResponse.sql) {
        const queryResult = await this.queryService.executeQuery(llmResponse.sql)

        if (!queryResult.success) {
          finalContent = `Erro ao executar consulta: ${queryResult.error}`
        } else {
          finalContent = JSON.stringify(queryResult.data, null, 2)
        }
      }

      // Criar mensagem de resposta do assistente
      const assistantMessage = await this.addMessage(actualSessionId, {
        type: 'assistant',
        content: finalContent
      })

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
   * Busca uma sessão no banco de dados via Prisma
   */
  public async getSessionFromDatabase(sessionId: string) {
    return prisma.sessao.findUnique({
      where: { id: sessionId },
      include: { mensagens: true, modelo: true }
    })
  }

  /**
   * Cria uma nova sessão no banco de dados via Prisma
   */
  private async createSessionInDatabase(usuarioId: string, titulo: string, modelo: LLMModel) {
    return prisma.sessao.create({
      data: {
        usuarioId,
        titulo,
        modeloId: modelo.id
      },
      include: {
        mensagens: true,
        modelo: true
      }
    })
  }

  /**
   * Adiciona mensagem no banco via Prisma
   */
  public async addMessage(sessaoId: string, message: { type: string; content: string }) {
    return prisma.mensagem.create({
      data: {
        sessaoId,
        tipo: message.type,
        conteudo: message.content,
        timestamp: new Date()
      }
    })
  }
}
