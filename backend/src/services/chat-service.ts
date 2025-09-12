import { Message, ChatSession, LLMModel, QueryResult } from '../types'
import { LLMService } from './llm-service'
import { QueryService } from './query-service'
import { CloudflareAIService } from './cloudflare-ai-service'
import { SchemaDiscoveryService } from './schema-discovery-service'
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
  private cloudflareAI: CloudflareAIService
  private schemaService: SchemaDiscoveryService

  private constructor() {
    this.sessionService = SessionService.getInstance()
    this.llmService = LLMService.getInstance()
    this.queryService = QueryService.getInstance()
    this.cloudflareAI = CloudflareAIService.getInstance()
    this.schemaService = SchemaDiscoveryService.getInstance()
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  /**
   * Assistente que usa Groq rápido para identificar e processar consultas educacionais
   */
  private async processWithEducationalAssistant(
    sessionId: string,
    message: string,
    userMessage: Message,
    session: ChatSession,
    selectedModel: string
  ): Promise<{
    success: boolean
    userMessage?: Message
    assistantMessage?: Message
    session?: ChatSession
    error?: string
  }> {
    try {
      // Usar Groq rápido como assistente educacional e resposta direta
      const assistantPrompt = `
Você é um assistente especializado em consultas SQL educacionais. Sua função é classificar a mensagem do usuário e responder adequadamente.

MENSAGEM DO USUÁRIO: "${message}"

INSTRUÇÕES IMPORTANTES:
- Para consultas de dados: responda APENAS com "SQL_QUERY"
- Para perguntas sobre estrutura: responda APENAS com "SCHEMA_INFO"
- Para saudações/conversas: responda de forma amigável como assistente educacional
- NÃO se identifique como "roteador" - você é um assistente para consultas SQL educacionais

CATEGORIAS:

1. Se for uma PERGUNTA que precisa de dados do banco (como "quantos", "mostre", "liste", "dados de", "cursos de", "instituições"), responda APENAS:
SQL_QUERY

2. Se for uma PERGUNTA sobre estrutura/schema do banco (como "quais tabelas", "que dados existem", "estrutura do banco"), responda APENAS:
SCHEMA_INFO

3. Se for SAUDAÇÃO ou CONVERSA geral (como "oi", "olá", "como funciona", "o que você faz"), responda normalmente de forma amigável como um assistente educacional.

EXEMPLOS:
- "oi" → Olá! Sou seu assistente para consultas em dados educacionais. Posso ajudar você a explorar informações do INEP através de consultas SQL. Como posso ajudar?
- "quantos cursos de pedagogia existem" → SQL_QUERY
- "mostre dados de 2023" → SQL_QUERY
- "liste as universidades" → SQL_QUERY
- "quais tabelas existem" → SCHEMA_INFO
- "que dados temos disponíveis" → SCHEMA_INFO
- "como funciona o SQL" → SQL é uma linguagem para consultar bancos de dados. Posso ajudar você a criar consultas para explorar dados educacionais do INEP!

RESPOSTA:`

console.log("🚀 ~ ChatService ~ processWithEducationalAssistant ~ assistantPrompt:", assistantPrompt)
      // Usar LLMService para chamar o modelo rápido
      const assistantResponse = await this.llmService.handlePrompt({
        prompt: assistantPrompt,
        model: 'llama-3.1-8b-instant'

      })
      console.log("🚀 ~ ChatService ~ processWithEducationalAssistant ~ assistantResponse:", assistantResponse)

      if (!assistantResponse.success) {
        throw new Error(`Erro no assistente: ${assistantResponse.error}`)
      }

      console.log("🚀 ~ ChatService ~ processWithEducationalAssistant ~ assistantResponse:", assistantResponse)
      const response = (assistantResponse.content || '').trim()

      if (!response) {
        throw new Error('Resposta vazia do assistente')
      }

      if (response.includes('SQL_QUERY')) {
        // É uma consulta SQL - partir para fluxo de geração SQL
        return await this.processSQLQuery(sessionId, message, userMessage, session, selectedModel)
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

      const errorMessageData = await this.addMessage(sessionId, {
        type: 'error',
        content: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userMessage,
        assistantMessage: mapMessage(errorMessageData)
      }
    }
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

      // Verificar se é a terceira mensagem do usuário para gerar título automaticamente
      await this.checkAndGenerateAutoTitle(actualSessionId, sessionData)

      // NOVO FLUXO: Usar assistente educacional para todas as mensagens
      return await this.processWithEducationalAssistant(actualSessionId, message, userMessage, session, model)
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
        // Continuar sem reverse translation em caso de erro
      }

      const assistantMessageData = await this.updateMessage(mensagem.id, {
        queryResult: dbResponse,
        reverseTranslation: reverseTranslation || null
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
   * Processa consultas que requerem geração e execução de SQL
   */
  private async processSQLQuery(
    sessionId: string,
    question: string,
    userMessage: Message,
    session: ChatSession,
    selectedModel: string
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

      if (!fullSchema) {
        const errorMessageData = await this.addMessage(sessionId, {
          type: 'error',
          content: 'Schema do banco não encontrado. Execute a descoberta do schema primeiro.'
        })

        return {
          success: false,
          error: 'Schema não encontrado',
          userMessage,
          assistantMessage: mapMessage(errorMessageData)
        }
      }

      // Reduzir schema baseado na pergunta usando Cloudflare AI
      const schemaReduction = await this.cloudflareAI.reduceSchema(question, JSON.stringify(fullSchema))

      if (!schemaReduction.success) {
        const errorMessageData = await this.addMessage(sessionId, {
          type: 'error',
          content: `Erro ao reduzir schema: ${schemaReduction.error}`
        })

        return {
          success: false,
          error: schemaReduction.error,
          userMessage,
          assistantMessage: mapMessage(errorMessageData)
        }
      }

      // Gerar SQL usando o modelo selecionado pelo usuário
      let sqlResponse: { success: boolean; sql?: string; error?: string }

      if (selectedModel === 'cloudflare-sqlcoder-7b-2' || selectedModel.includes('cloudflare')) {
        // Usar Cloudflare AI SQLCoder
        const prompt = `
### Task
Generate a SQL query to answer this question: ${question}

### Database Schema
${schemaReduction.reducedSchema}

### Important Rules
- ALWAYS add LIMIT 100 to SELECT * queries to prevent database overload
- Use LIMIT 50 for complex queries with JOINs
- Optimize for performance and safety

### SQL Query
`
        sqlResponse = await this.cloudflareAI.generateSQL({ prompt })
      } else {
        // Usar LLMService para outros modelos (Groq, etc.)
        const prompt = `
Você é um especialista em SQL. Gere uma consulta SQL para responder a pergunta do usuário.

PERGUNTA: ${question}

SCHEMA DO BANCO:
${schemaReduction.reducedSchema}

INSTRUÇÕES OBRIGATÓRIAS:
- Retorne APENAS o código SQL, sem explicações
- Use nomes de tabelas e colunas exatos do schema
- SEMPRE adicione LIMIT 100 em consultas SELECT * para proteger o banco
- Use LIMIT 50 para consultas complexas com JOINs
- Otimize a consulta para performance e segurança
- Use JOINs quando necessário

EXEMPLO:
SELECT * FROM tabela LIMIT 100;
SELECT t1.*, t2.nome FROM tabela1 t1 JOIN tabela2 t2 ON t1.id = t2.id LIMIT 50;

SQL:`

        const llmResponse = await this.llmService.handlePrompt({
          prompt,
          model: selectedModel,
          context: { schemaName: 'inep' }
        })

        if (llmResponse.success && llmResponse.content) {
          // Extrair SQL da resposta
          const sql = this.cloudflareAI.extractSQL(llmResponse.content)
          sqlResponse = { success: true, sql }
        } else {
          sqlResponse = { success: false, error: llmResponse.error || 'Erro ao gerar SQL' }
        }
      }

      if (!sqlResponse.success) {
        const errorMessageData = await this.addMessage(sessionId, {
          type: 'error',
          content: `Erro ao gerar SQL: ${sqlResponse.error}`
        })

        return {
          success: false,
          error: sqlResponse.error,
          userMessage,
          assistantMessage: mapMessage(errorMessageData)
        }
      }

      // Sanitizar SQL para garantir LIMIT
      const sanitizedSQL = this.sanitizeSQL(sqlResponse.sql!)
      console.log('🔧 SQL original:', sqlResponse.sql)
      console.log('✅ SQL sanitizado:', sanitizedSQL)

      // Executar SQL
      const queryResult = await this.queryService.executeQuery(sanitizedSQL)

      if (!queryResult.success) {
        const errorMessageData = await this.addMessage(sessionId, {
          type: 'error',
          content: `Erro ao executar consulta: ${queryResult.error}`
        })

        return {
          success: false,
          error: queryResult.error || 'Erro ao executar consulta',
          userMessage,
          assistantMessage: mapMessage(errorMessageData)
        }
      }

      // Gerar explicação automática do resultado usando Groq rápido
      let explanation = ''
      try {
        const explanationPrompt = `
Você é um assistente especializado em explicar resultados de consultas SQL de forma clara e amigável.

PERGUNTA ORIGINAL: ${question}
SQL EXECUTADO: ${sqlResponse.sql}
RESULTADO: ${queryResult.success ? `${queryResult.data?.length || 0} registros encontrados` : `Erro: ${queryResult.error}`}

Explique de forma natural e amigável:
1. O que a consulta fez
2. O que os resultados significam
3. Insights relevantes dos dados (se houver)

Seja conciso mas informativo. Use linguagem natural, não técnica.
`

        const explanationResponse = await this.llmService.handlePrompt({
          prompt: explanationPrompt,
          model: 'llama-3.1-8b-instant', // Modelo rápido
          context: { schemaName: 'inep' }
        })

        if (explanationResponse.success && explanationResponse.content) {
          explanation = explanationResponse.content
        }
      } catch (error) {
        console.error('❌ Erro ao gerar explicação:', error)
      }

      // Criar mensagem de sucesso com dados, SQL e explicação
      const content = queryResult.success
        ? `${explanation}\n\n**Dados encontrados:**\n${this.formatQueryResult(queryResult)}`
        : `Erro na execução da consulta: ${queryResult.error}`

      const assistantMessageData = await this.addMessage(sessionId, {
        type: 'assistant',
        content
      }, {
        sqlQuery: sanitizedSQL, // Usar SQL sanitizado
        queryResult,
        reverseTranslation: explanation || question,
        hasExplanation: !!explanation,
        explanation
      })

      return {
        success: true,
        userMessage,
        assistantMessage: mapMessage(assistantMessageData),
        session
      }

    } catch (error) {
      console.error('❌ Erro ao processar pergunta SQL:', error)

      const errorMessageData = await this.addMessage(sessionId, {
        type: 'error',
        content: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userMessage,
        assistantMessage: mapMessage(errorMessageData)
      }
    }
  }

  /**
   * Sanitiza SQL para garantir que sempre tenha LIMIT em consultas SELECT
   */
  private sanitizeSQL(sql: string): string {
    if (!sql) return sql

    // Remover espaços extras e quebras de linha
    const cleanSQL = sql.trim().replace(/\s+/g, ' ')

    // Verificar se é uma consulta SELECT
    if (!cleanSQL.toLowerCase().startsWith('select')) {
      return cleanSQL
    }

    // Verificar se já tem LIMIT
    if (cleanSQL.toLowerCase().includes('limit')) {
      return cleanSQL
    }

    // Adicionar LIMIT baseado no tipo de consulta
    const hasJoin = cleanSQL.toLowerCase().includes('join')
    const hasSelectStar = cleanSQL.toLowerCase().includes('select *')

    let limitValue = 100 // Padrão
    if (hasJoin) {
      limitValue = 50 // Consultas com JOIN são mais pesadas
    } else if (hasSelectStar) {
      limitValue = 100 // SELECT * pode retornar muitos dados
    }

    // Adicionar LIMIT no final (antes de possível ORDER BY)
    if (cleanSQL.toLowerCase().includes('order by')) {
      const orderByIndex = cleanSQL.toLowerCase().lastIndexOf('order by')
      const beforeOrderBy = cleanSQL.substring(0, orderByIndex).trim()
      const orderByPart = cleanSQL.substring(orderByIndex)
      return `${beforeOrderBy} LIMIT ${limitValue} ${orderByPart}`
    } else {
      return `${cleanSQL} LIMIT ${limitValue}`
    }
  }

  /**
   * Formata o resultado da query para exibição
   */
  private formatQueryResult(result: QueryResult): string {
    if (!result.success || !result.data) {
      return 'Nenhum dado encontrado.'
    }

    const data = Array.isArray(result.data) ? result.data : [result.data]

    if (data.length === 0) {
      return 'Nenhum registro encontrado.'
    }

    // Limitar a 10 registros para não sobrecarregar a resposta
    const limitedData = data.slice(0, 10)

    // Criar tabela simples
    const headers = Object.keys(limitedData[0])
    let table = headers.join(' | ') + '\n'
    table += headers.map(() => '---').join(' | ') + '\n'

    limitedData.forEach(row => {
      table += headers.map(header => String(row[header] || '')).join(' | ') + '\n'
    })

    if (data.length > 10) {
      table += `\n... e mais ${data.length - 10} registros.`
    }

    return table
  }

  /**
   * Processa perguntas sobre schema/estrutura do banco
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
          type: 'error',
          content: 'Schema do banco não encontrado. Execute a descoberta do schema primeiro.'
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

      const errorMessageData = await this.addMessage(sessionId, {
        type: 'error',
        content: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userMessage,
        assistantMessage: mapMessage(errorMessageData)
      }
    }
  }

  /**
   * Gera uma resposta amigável sobre o schema do banco usando LLM
   */
  private async generateSchemaResponse(schema: any, question: string): Promise<string> {
    const tables = schema.tables || []
    const totalTables = tables.length

    // Preparar informações resumidas das principais tabelas
    const mainTables = tables
      .sort((a: any, b: any) => (b.columnCount || 0) - (a.columnCount || 0))
      .slice(0, 10) // Top 10 tabelas

    const tablesInfo = mainTables.map((table: any) => {
      const keyColumns = table.keyColumns?.map((col: any) => col.name).join(', ') || 'N/A'
      const importantColumns = table.importantColumns?.map((col: any) => col.name).slice(0, 5).join(', ') || 'N/A'

      return `- ${table.name} (${table.columnCount || 0} colunas)
  Chaves: ${keyColumns}
  Colunas importantes: ${importantColumns}
  ${table.comment ? `Descrição: ${table.comment}` : ''}`
    }).join('\n')

    // Criar prompt para o LLM
    const prompt = `Você é um assistente especializado em dados educacionais do INEP. O usuário perguntou: "${question}"

INFORMAÇÕES DO BANCO DE DADOS:
- Total de tabelas: ${totalTables}
- Schema: inep
- Tipo: Dados educacionais do Brasil (INEP)

PRINCIPAIS TABELAS DISPONÍVEIS:
${tablesInfo}

RELACIONAMENTOS:
${schema.relationships?.map((rel: any) => `- ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}`).join('\n') || 'Relacionamentos automáticos detectados'}

INSTRUÇÕES:
1. Responda de forma amigável e informativa sobre o schema
2. Destaque as principais tabelas e seus propósitos
3. Explique que tipos de dados educacionais estão disponíveis
4. Sugira exemplos de perguntas que o usuário pode fazer
5. Use emojis e formatação markdown para deixar a resposta mais atrativa
6. Mantenha o foco nos dados educacionais do INEP
7. Seja conciso mas informativo (máximo 300 palavras)

Resposta:`

    try {
      const llmResponse = await this.llmService.handlePrompt({
        prompt,
        model: 'llama-3.1-8b-instant'
      })

      if (llmResponse.success && llmResponse.content) {
        return llmResponse.content
      } else {
        throw new Error(`Erro do LLM: ${llmResponse.error || 'Resposta vazia'}`)
      }
    } catch (error) {
      console.error('❌ Erro ao gerar resposta do schema via LLM:', error)
      throw error
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

  /**
   * Verifica se é a terceira mensagem do usuário e gera título automaticamente
   */
  private async checkAndGenerateAutoTitle(sessionId: string, sessionData: any): Promise<void> {
    try {
      // Contar mensagens do usuário na sessão
      const userMessagesCount = await prisma.mensagem.count({
        where: {
          sessaoId: sessionId,
          tipo: 'user'
        }
      })

      console.log(`📊 Sessão ${sessionId}: ${userMessagesCount} mensagens do usuário`)

      // Se é exatamente a terceira mensagem do usuário, gerar título automaticamente
      if (userMessagesCount === 3) {
        console.log('🎯 Terceira mensagem detectada! Gerando título automático...')

        // Verificar se a sessão ainda tem título padrão
        const currentTitle = sessionData.titulo
        const isDefaultTitle = currentTitle.includes('Sessão') && currentTitle.includes('/')

        if (isDefaultTitle) {
          await this.generateConversationTitle(sessionId)
        } else {
          console.log('ℹ️ Sessão já possui título personalizado, não gerando automaticamente')
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar/gerar título automático:', error)
      // Não falhar o processamento da mensagem por causa do título
    }
  }

  /**
   * Gera um título para a conversa baseado nas primeiras mensagens usando LLMService
   */
  private async generateConversationTitle(sessionId: string): Promise<void> {
    try {
      console.log('🤖 Gerando título automático para sessão:', sessionId)

      // Buscar as primeiras mensagens do usuário para gerar o título
      const userMessages = await prisma.mensagem.findMany({
        where: {
          sessaoId: sessionId,
          tipo: 'user'
        },
        orderBy: {
          timestamp: 'asc'
        },
        take: 3 // Pegar as 3 primeiras mensagens do usuário
      })

      if (userMessages.length === 0) {
        console.log('⚠️ Nenhuma mensagem do usuário encontrada para gerar título')
        return
      }

      // Usar LLMService para gerar o título
      const generatedTitle = await this.llmService.generateConversationTitle(userMessages)

      if (generatedTitle) {
        // Atualizar o título da sessão
        await this.sessionService.updateSessionTitle(sessionId, generatedTitle)

        // Emitir evento WebSocket para notificar o frontend sobre a atualização do título
        if (global.socketIO) {
          global.socketIO.to(sessionId).emit('session-title-updated', {
            sessionId,
            title: generatedTitle
          })
          console.log('📡 Evento session-title-updated emitido para sessão:', sessionId)
        }

        console.log('✅ Título automático gerado:', generatedTitle)
      } else {
        console.log('⚠️ Não foi possível gerar título automático')
      }

    } catch (error) {
      console.error('❌ Erro ao gerar título automático:', error)
      // Não falhar o processamento por causa do título
    }
  }
}
