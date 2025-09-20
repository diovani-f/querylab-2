import { Message, ChatSession, LLMModel, QueryResult } from '../types'
import { LLMService } from './llm-service'
import { QueryService } from './query-service'
import { CloudflareAIService } from './cloudflare-ai-service'
import { SchemaDiscoveryService } from './schema-discovery-service'
import { SQLGenerationService } from './sql-generation-service'
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
 * REFATORADO: Agora usa SQLGenerationService unificado e timeout nas execuções
 */
export class ChatService {
  private static instance: ChatService
  private sessionService: SessionService
  private llmService: LLMService
  private queryService: QueryService
  private cloudflareAI: CloudflareAIService
  private schemaService: SchemaDiscoveryService
  private sqlGenerationService: SQLGenerationService

  private constructor() {
    this.sessionService = SessionService.getInstance()
    this.llmService = LLMService.getInstance()
    this.queryService = QueryService.getInstance()
    this.cloudflareAI = CloudflareAIService.getInstance()
    this.schemaService = SchemaDiscoveryService.getInstance()
    this.sqlGenerationService = SQLGenerationService.getInstance()
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
    autoExecuteSQL?: boolean
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

      const session = mapSession(sessionData)

      // Salvar mensagem do usuário
      const userMessageData = await this.addMessage(sessionId, {
        type: 'user',
        content: message
      })
      const userMessage = mapMessage(userMessageData)

      // Processar mensagem usando assistente educacional
      return await this.classifyAndProcess(sessionId, message, userMessage, session, model, params.autoExecuteSQL)

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Constrói contexto da conversa para melhor classificação
   */
  private buildConversationContext(messages: Message[]): string {
    if (!messages || messages.length === 0) {
      return "CONTEXTO: Esta é a primeira mensagem da conversa."
    }

    // Pegar as últimas 6 mensagens (3 pares usuário-assistente)
    const recentMessages = messages.slice(-6)

    if (recentMessages.length === 0) {
      return "CONTEXTO: Esta é a primeira mensagem da conversa."
    }

    const contextLines = recentMessages.map(msg => {
      const role = msg.tipo === 'user' ? 'USUÁRIO' : 'ASSISTENTE'
      const content = msg.conteudo.length > 100
        ? msg.conteudo.substring(0, 100) + '...'
        : msg.conteudo

      return `${role}: ${content}`
    })

    return `CONTEXTO DA CONVERSA (últimas mensagens):
${contextLines.join('\n')}

---`
  }

  /**
   * Classifica e processa a mensagem usando LLM
   */
  private async classifyAndProcess(
    sessionId: string,
    message: string,
    userMessage: Message,
    session: ChatSession,
    selectedModel: string,
    autoExecuteSQL?: boolean
  ): Promise<{
    success: boolean
    userMessage?: Message
    assistantMessage?: Message
    session?: ChatSession
    error?: string
  }> {
    try {
      // Construir contexto da conversa
      const conversationContext = this.buildConversationContext(session.mensagens)

      // Usar modelo inteligente como assistente educacional
      const assistantPrompt = `
Você é um assistente especializado em dados educacionais do INEP (Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira).

${conversationContext}

MENSAGEM ATUAL: "${message}"

INSTRUÇÕES:
Analise a mensagem atual considerando o contexto da conversa e responda de acordo com uma das categorias:

1. CONSULTA DE DADOS - Se o usuário quer dados específicos (quantos, mostre, liste, dados de, cursos, instituições, estudantes, etc.):
   Responda APENAS: SQL_QUERY

2. INFORMAÇÕES DO BANCO - Se pergunta sobre estrutura, tabelas disponíveis, que dados existem:
   Responda APENAS: SCHEMA_INFO

3. CONVERSA GERAL - Para saudações, explicações, dúvidas sobre o sistema, ou continuação de conversa:
   Responda naturalmente como assistente educacional especializado em dados do INEP, considerando o contexto anterior.

EXEMPLOS:
- "quantos cursos de pedagogia" → SQL_QUERY
- "e no Rio de Janeiro?" (após pergunta sobre cursos) → SQL_QUERY
- "universidades do Rio de Janeiro" → SQL_QUERY
- "quais tabelas existem" → SCHEMA_INFO
- "que dados vocês têm" → SCHEMA_INFO
- "oi, como funciona" → Olá! Sou especialista em dados educacionais do INEP...
- "obrigado" (após consulta) → De nada! Posso ajudar com mais alguma consulta sobre dados educacionais?

RESPOSTA:`

      // Usar LLMService para chamar Gemini (modelo mais inteligente para classificação)
      const assistantResponse = await this.llmService.handlePrompt({
        prompt: assistantPrompt,
        model: 'gemini-2.5-flash-lite'
      })

      if (!assistantResponse.success) {
        throw new Error(`Erro no assistente: ${assistantResponse.error}`)
      }
      const response = (assistantResponse.content || '').trim()

      if (!response) {
        throw new Error('Resposta vazia do assistente')
      }

      if (response.includes('SQL_QUERY')) {
        // É uma consulta SQL - usar novo SQLGenerationService
        return await this.processSQLQueryRefactored(sessionId, message, userMessage, session, selectedModel, autoExecuteSQL)
      } else if (response.includes('SCHEMA_INFO')) {
        // É uma pergunta sobre schema - retornar informações das tabelas
        return await this.processSchemaInfo(sessionId, message, userMessage, session)
      } else {
        // É uma conversa/explicação - usar a resposta direta do modelo
        const assistantMessageData = await this.addMessage(sessionId, {
          type: 'assistant',
          content: response
        })

        return {
          success: true,
          userMessage,
          assistantMessage: mapMessage(assistantMessageData),
          session
        }
      }

    } catch (error) {
      console.error('❌ Erro no assistente educacional:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na classificação',
        userMessage
      }
    }
  }

  /**
   * Processa consultas SQL usando o novo SQLGenerationService
   */
  private async processSQLQueryRefactored(
    sessionId: string,
    question: string,
    userMessage: Message,
    session: ChatSession,
    selectedModel: string,
    autoExecuteSQL?: boolean
  ): Promise<{
    success: boolean
    userMessage?: Message
    assistantMessage?: Message
    session?: ChatSession
    error?: string
  }> {
    try {
      console.log(`🔧 Processando SQL Query com modelo: ${selectedModel}`)

      // Usar o novo SQLGenerationService unificado
      const sqlGenerationResult = await this.sqlGenerationService.generateSQL({
        question,
        model: selectedModel,
        sessionId,
        conversationHistory: session.mensagens
      })

      if (!sqlGenerationResult.success) {
        // Criar mensagem de erro
        const errorMessageData = await this.addMessage(sessionId, {
          type: 'assistant',
          content: `Não foi possível gerar a consulta SQL: ${sqlGenerationResult.error}`
        })

        return {
          success: false,
          error: sqlGenerationResult.error,
          userMessage,
          assistantMessage: mapMessage(errorMessageData)
        }
      }

      // Salvar mensagem assistant com SQL gerado e explicação
      let assistantMessageData = await this.addMessage(sessionId, {
        type: 'assistant',
        content: sqlGenerationResult.explanation || 'Consulta SQL gerada com sucesso!'
      }, {
        sqlQuery: sqlGenerationResult.sql,
        queryResult: null, // Será preenchido quando executar
        hasExplanation: true,
        explanation: sqlGenerationResult.explanation,
        reverseTranslation: null // Será preenchido após execução
      })

      // Se execução automática está ativa, executar SQL imediatamente
      if (autoExecuteSQL) {
        console.log('🚀 Execução automática ativa - executando SQL imediatamente')

        try {
          // Executar SQL com timeout
          const dbResponse = await this.queryService.executeQueryWithTimeout(sqlGenerationResult.sql!, {
            timeoutMs: 30000,
            retryAttempts: 1,
            retryDelayMs: 1000
          })

          // Gerar reverse translation se execução foi bem-sucedida, ou explicação de erro se falhou
          let reverseTranslation = ''
          let errorExplanation = ''

          if (dbResponse.success) {
            try {
              console.log('🔄 Gerando reverse translation...')
              reverseTranslation = await this.llmService.generateReverseTranslation({
                sql: sqlGenerationResult.sql!,
                result: dbResponse,
                originalPrompt: question
              })
              console.log('✅ Reverse translation gerada:', reverseTranslation)
            } catch (error) {
              console.error('❌ Erro ao gerar reverse translation:', error)
            }
          } else {
            // Se houve erro, gerar explicação amigável
            try {
              console.log('🔄 Gerando explicação de erro...')
              errorExplanation = await this.llmService.generateErrorExplanation({
                originalPrompt: question,
                sql: sqlGenerationResult.sql!,
                error: dbResponse.error || 'Erro desconhecido'
              })
              console.log('✅ Explicação de erro gerada:', errorExplanation)
            } catch (error) {
              console.error('❌ Erro ao gerar explicação de erro:', error)
            }
          }

          // Atualizar mensagem com resultado da execução
          assistantMessageData = await this.updateMessage(assistantMessageData.id, {
            queryResult: dbResponse,
            reverseTranslation: reverseTranslation || null,
            explanation: errorExplanation || null,
            hasExplanation: !!errorExplanation
          })

          console.log('✅ SQL executado automaticamente com sucesso')
        } catch (error) {
          console.error('❌ Erro na execução automática:', error)
          // Não falhar o processo todo se a execução automática falhar
        }
      }

      return {
        success: true,
        userMessage,
        assistantMessage: mapMessage(assistantMessageData),
        session
      }

    } catch (error) {
      console.error('❌ Erro ao processar pergunta SQL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no processamento SQL',
        userMessage
      }
    }
  }

  /**
   * Executa query com timeout melhorado
   */
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

      // Usar execução com timeout melhorado
      const dbResponse = await this.queryService.executeQueryWithTimeout(mensagem.sqlQuery, {
        timeoutMs: 30000, // 30 segundos
        retryAttempts: 1,
        retryDelayMs: 1000
      })

      if (!dbResponse.success) {
        // Gerar explicação amigável do erro usando Groq
        let errorExplanation = ''
        try {
          console.log('🔄 Gerando explicação de erro...')
          errorExplanation = await this.llmService.generateErrorExplanation({
            originalPrompt: mensagem.conteudo,
            sql: mensagem.sqlQuery,
            error: dbResponse.error || 'Erro desconhecido'
          })
          console.log('✅ Explicação de erro gerada:', errorExplanation)
        } catch (error) {
          console.error('❌ Erro ao gerar explicação de erro:', error)
          errorExplanation = `Erro na execução: ${dbResponse.error}`
        }

        // Criar mensagem de erro com explicação amigável
        const errorMessageData = await this.addMessage(mensagem.sessaoId, {
          type: 'assistant',
          content: errorExplanation
        }, {
          sqlQuery: mensagem.sqlQuery,
          queryResult: dbResponse,
          hasExplanation: true,
          explanation: errorExplanation // Salvar explicação do erro no explanation
        })

        return {
          success: false,
          error: `Erro ao processar consulta: ${dbResponse.error}`,
          assistantMessage: mapMessage(errorMessageData),
          sessionId: mensagem.sessaoId
        }
      }

      // Gerar reverse translation após execução bem-sucedida
      let reverseTranslation = ''
      try {
        console.log('🔄 Gerando reverse translation...')
        reverseTranslation = await this.llmService.generateReverseTranslation({
          sql: mensagem.sqlQuery,
          result: dbResponse,
          originalPrompt: mensagem.conteudo
        })
        console.log('✅ Reverse translation gerada:', reverseTranslation)
      } catch (error) {
        console.error('❌ Erro ao gerar reverse translation:', error)
      }

      const assistantMessageData = await this.updateMessage(mensagem.id, {
        queryResult: dbResponse,
        reverseTranslation: reverseTranslation || null
      })

      return {
        success: true,
        assistantMessage: mapMessage(assistantMessageData),
        sessionId: mensagem.sessaoId
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      }
    }
  }

  /**
   * Processa informações sobre schema
   */
  private async processSchemaInfo(
    sessionId: string,
    question: string,
    userMessage: Message,
    session: ChatSession
  ): Promise<{
    success: boolean
    userMessage?: Message
    assistantMessage?: Message
    session?: ChatSession
    error?: string
  }> {
    try {
      // Obter schema completo do banco
      const fullSchema = await this.schemaService.getSchemaForLLM('inep')

      if (!fullSchema || !fullSchema.tables || fullSchema.tables.length === 0) {
        const errorMessageData = await this.addMessage(sessionId, {
          type: 'assistant',
          content: 'Schema do banco de dados não encontrado. Execute a descoberta do schema primeiro.'
        })

        return {
          success: false,
          error: 'Schema não encontrado',
          userMessage,
          assistantMessage: mapMessage(errorMessageData)
        }
      }

      // Gerar resposta sobre o schema usando LLM
      const schemaResponse = await this.generateSchemaResponse(fullSchema, question)

      const assistantMessageData = await this.addMessage(sessionId, {
        type: 'assistant',
        content: schemaResponse
      })

      return {
        success: true,
        userMessage,
        assistantMessage: mapMessage(assistantMessageData),
        session
      }

    } catch (error) {
      console.error('❌ Erro ao processar informações do schema:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no processamento do schema',
        userMessage
      }
    }
  }

  /**
   * Gera resposta sobre schema
   */
  private async generateSchemaResponse(schema: any, question: string): Promise<string> {
    const tables = schema.tables || []
    const totalTables = tables.length

    const mainTables = tables
      .sort((a: any, b: any) => (b.columnCount || 0) - (a.columnCount || 0))
      .slice(0, 10)

    const tablesInfo = mainTables.map((table: any) => {
      const keyColumns = table.keyColumns?.map((col: any) => col.name).join(', ') || 'N/A'
      const importantColumns = table.importantColumns?.map((col: any) => col.name).slice(0, 5).join(', ') || 'N/A'

      return `- ${table.name} (${table.columnCount || 0} colunas)
  Chaves: ${keyColumns}
  Colunas importantes: ${importantColumns}`
    }).join('\n')

    const prompt = `Você é um especialista em dados educacionais do INEP. O usuário perguntou: "${question}"

📊 **BANCO DE DADOS EDUCACIONAIS INEP**
- Total de tabelas: ${totalTables}
- Fonte: Instituto Nacional de Estudos e Pesquisas Educacionais
- Cobertura: Ensino superior brasileiro

🗂️ **PRINCIPAIS TABELAS:**
${tablesInfo}

**INSTRUÇÕES:**
Responda de forma clara e útil sobre nossos dados educacionais. Destaque:
- Que tipos de informações educacionais temos disponíveis
- Como as tabelas se relacionam
- Exemplos práticos de perguntas que podem ser feitas
- Use emojis e markdown para clareza
- Seja informativo mas conciso (máximo 250 palavras)

**Resposta:**`

    try {
      const llmResponse = await this.llmService.handlePrompt({
        prompt,
        model: 'gemini-2.5-flash-lite'
      })

      if (llmResponse.success && llmResponse.content) {
        return llmResponse.content
      } else {
        throw new Error(`Erro do LLM: ${llmResponse.error || 'Resposta vazia'}`)
      }
    } catch (error) {
      console.error('❌ Erro ao gerar resposta do schema via LLM:', error)
      return 'Erro ao gerar informações sobre o schema.'
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

  /**
   * Atualiza mensagem existente
   */
  public async updateMessage(messageId: string, data: any) {
    const updateData: any = {
      queryResult: data.queryResult as any,
      reverseTranslation: data.reverseTranslation
    }

    // Adicionar campos opcionais se fornecidos
    if (data.explanation !== undefined) {
      updateData.explanation = data.explanation
    }
    if (data.hasExplanation !== undefined) {
      updateData.hasExplanation = data.hasExplanation
    }

    return prisma.mensagem.update({
      where: { id: messageId },
      data: updateData
    });
  }
}
