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
   * Assistente que usa Groq inteligente (Llama 3.3 70B) para identificar e processar consultas educacionais
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
      // Usar modelo inteligente como assistente educacional
      const assistantPrompt = `
Você é um assistente especializado em dados educacionais do INEP (Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira).

MENSAGEM: "${message}"

INSTRUÇÕES:
Analise a mensagem e responda de acordo com uma das categorias:

1. CONSULTA DE DADOS - Se o usuário quer dados específicos (quantos, mostre, liste, dados de, cursos, instituições, estudantes, etc.):
   Responda APENAS: SQL_QUERY

2. INFORMAÇÕES DO BANCO - Se pergunta sobre estrutura, tabelas disponíveis, que dados existem:
   Responda APENAS: SCHEMA_INFO

3. CONVERSA GERAL - Para saudações, explicações, dúvidas sobre o sistema:
   Responda naturalmente como assistente educacional especializado em dados do INEP.

EXEMPLOS:
- "quantos cursos de pedagogia" → SQL_QUERY
- "universidades do Rio de Janeiro" → SQL_QUERY
- "quais tabelas existem" → SCHEMA_INFO
- "que dados vocês têm" → SCHEMA_INFO
- "oi, como funciona" → Olá! Sou especialista em dados educacionais do INEP. Posso ajudar você a explorar informações sobre educação superior, cursos, instituições e muito mais através de consultas inteligentes. O que gostaria de descobrir?

RESPOSTA:`

console.log("🚀 ~ ChatService ~ processWithEducationalAssistant ~ assistantPrompt:", assistantPrompt)
      // Usar LLMService para chamar o modelo mais inteligente
      const assistantResponse = await this.llmService.handlePrompt({
        prompt: assistantPrompt,
        model: 'llama-3.3-70b-versatile'

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

      // Fallback: tentar responder de forma básica baseado em palavras-chave
      let fallbackResponse = 'Desculpe, houve um problema temporário. '

      if (message.toLowerCase().includes('quantos') ||
          message.toLowerCase().includes('mostre') ||
          message.toLowerCase().includes('liste')) {
        fallbackResponse += 'Parece que você quer consultar dados. Tente reformular sua pergunta de forma mais específica.'
      } else if (message.toLowerCase().includes('tabela') ||
                 message.toLowerCase().includes('schema') ||
                 message.toLowerCase().includes('dados disponíveis')) {
        fallbackResponse += 'Você quer saber sobre nossa estrutura de dados. Tente perguntar "que dados vocês têm disponíveis?"'
      } else {
        fallbackResponse += 'Sou um assistente para dados educacionais do INEP. Posso ajudar com consultas sobre cursos, instituições e dados educacionais.'
      }

      const errorMessageData = await this.addMessage(sessionId, {
        type: 'assistant',
        content: fallbackResponse
      })

      return {
        success: true, // Mudamos para success: true pois temos um fallback
        userMessage,
        assistantMessage: mapMessage(errorMessageData),
        session
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
   * FUNÇÃO PRINCIPAL: Gerencia todo o fluxo completo de SQL (geração + execução + explicação)
   * Usa CloudflareAIService.processSQL() apenas como auxiliar para geração
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

      // Gerar SQL usando o modelo selecionado pelo usuário
      let sqlResponse: { success: boolean; sql?: string; error?: string }

      if (selectedModel === 'cloudflare-sqlcoder-7b-2' || selectedModel.includes('cloudflare')) {
        // Usar função processSQL do CloudflareAI (reduz schema + gera SQL)
        console.log('🤖 Usando Cloudflare AI para gerar SQL...')
        const cloudflareResponse = await this.cloudflareAI.processSQL(question, JSON.stringify(fullSchema))
        console.log('🔍 Resposta Cloudflare:', cloudflareResponse)

        if (cloudflareResponse.success) {
          sqlResponse = { success: true, sql: cloudflareResponse.sql }
        } else {
          sqlResponse = { success: false, error: cloudflareResponse.error }
        }
      } else {
        // Para outros modelos (Groq, etc.), precisamos reduzir schema primeiro
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

        console.log('📊 Schema reduzido:', schemaReduction.reducedSchema?.substring(0, 300) + '...')

        // Usar LLMService para outros modelos (Groq, etc.)
        const prompt = `
Você é um especialista em SQL e dados educacionais do INEP. Gere uma consulta SQL otimizada para responder a pergunta sobre dados educacionais.

PERGUNTA: ${question}

SCHEMA DO BANCO (INEP):
${schemaReduction.reducedSchema}

REGRAS OBRIGATÓRIAS:
- Retorne APENAS o código SQL limpo, sem explicações ou formatação markdown
- NÃO adicione ponto e vírgula (;) no final - será adicionado automaticamente
- SEMPRE prefixe nomes de tabelas com "inep." (ex: inep.censo_cursos, inep.censo_modalidades_ensino)
- Use nomes exatos de tabelas e colunas do schema fornecido
- SEMPRE adicione LIMIT 100 para SELECT * (proteção do banco)
- Use LIMIT 50 para consultas com múltiplos JOINs
- Priorize performance: use índices quando disponíveis
- Para dados educacionais, considere filtros por ano quando relevante

CONTEXTO EDUCACIONAL:
- Dados do ensino superior brasileiro
- Informações sobre cursos, instituições, estudantes
- Dados históricos por ano acadêmico

EXEMPLOS:
SELECT * FROM inep.censo_cursos WHERE area_conhecimento = 'Educação' LIMIT 100;
SELECT i.nome, COUNT(c.id) as total_cursos FROM inep.instituicoes i JOIN inep.cursos c ON i.id = c.instituicao_id GROUP BY i.nome LIMIT 50;

SQL:`

        console.log('🤖 Usando Groq para gerar SQL...')
        console.log('📝 Prompt enviado:', prompt.substring(0, 200) + '...')

        const llmResponse = await this.llmService.handlePrompt({
          prompt,
          model: selectedModel,
          context: { schemaName: 'inep' }
        })

        console.log('🔍 Resposta Groq:', llmResponse)

        if (llmResponse.success && llmResponse.content) {
          // Extrair SQL da resposta
          console.log('📄 Conteúdo bruto da resposta:', llmResponse.content)
          const sql = this.cloudflareAI.extractSQL(llmResponse.content)
          console.log('🔧 SQL extraído:', sql)
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

      // Validar sintaxe básica do SQL
      if (sanitizedSQL.includes('; LIMIT')) {
        console.error('⚠️ ERRO DE SINTAXE DETECTADO: Ponto e vírgula antes do LIMIT')
        console.error('SQL problemático:', sanitizedSQL)
      }

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
        // Preparar dados para o prompt de explicação
        const resultSummary = this.prepareResultSummary(queryResult)
        console.log('🔍 Resumo dos resultados para explicação:', resultSummary)

        const explanationPrompt = `
Você é um assistente especializado em explicar resultados de consultas SQL de forma clara e amigável.

PERGUNTA ORIGINAL: ${question}
SQL EXECUTADO: ${sqlResponse.sql}
RESULTADO: ${resultSummary}

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
    let cleanSQL = sql.trim().replace(/\s+/g, ' ')

    // Verificar se é uma consulta SELECT
    if (!cleanSQL.toLowerCase().startsWith('select')) {
      return cleanSQL
    }

    // Remover ponto e vírgula do final se existir
    if (cleanSQL.endsWith(';')) {
      cleanSQL = cleanSQL.slice(0, -1).trim()
    }

    // Adicionar prefixo inep. às tabelas se não existir
    cleanSQL = this.addSchemaPrefix(cleanSQL)

    // Verificar se já tem LIMIT (mais rigoroso)
    const limitRegex = /\blimit\s+\d+\b/i
    if (limitRegex.test(cleanSQL)) {
      return cleanSQL + ';' // Adicionar ponto e vírgula de volta
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
      return `${beforeOrderBy} LIMIT ${limitValue} ${orderByPart};`
    } else {
      return `${cleanSQL} LIMIT ${limitValue};`
    }
  }

  /**
   * Adiciona prefixo inep. às tabelas se não existir
   */
  private addSchemaPrefix(sql: string): string {
    // Lista expandida de tabelas conhecidas do schema INEP
    const inepTables = [
      // Tabelas principais do censo
      'censo_cursos', 'censo_modalidades_ensino', 'censo_instituicoes', 'censo_niveis_academicos',
      'censo_graus_academicos', 'censo_organizacoes_academicas', 'censo_cine_area_geral',
      'censo_cine_area_especifica', 'censo_cine_rotulo', 'censo_curso_vagas_bruto',

      // Tabelas de dados dimensionais
      'dm_aluno', 'dm_curso', 'dm_ies',

      // Tabelas de dados e indicadores
      'dados_igc', 'dados_percepcao_enade', 'dados_percepcao_enade_questoes', 'dados_enade',
      'dados_cpc_brutos', 'igc_fatos',

      // Tabelas CAPES
      'capes_cursos_bruto', 'capes_programas_bruto',

      // Tabelas EMEC
      'emec_instituicoes',

      // Tabelas ENADE e microdados
      'microdados_enade_arq3', 'microdados_enade_arq5', 'microdados_enade_arq22', 'microdados_enade_arq29',
      'microdados_enade_respostas', 'microdados_enade_questoes', 'enade_dic_aux',

      // Tabelas geográficas e demográficas
      'regioes_ibge', 'mesoregioes_ibge', 'municipios_ibge', 'ufs_ibge',
      'ibge_demografia_por_idade_bruto', 'pibs_per_capita', 'variaveis_pib_municipios_ibge',

      // Outras tabelas importantes
      'idhms', 'ind_fluxo_ies_tda'
    ]

    let processedSQL = sql

    // Para cada tabela conhecida, verificar se precisa adicionar prefixo
    inepTables.forEach(tableName => {
      // Regex para encontrar referências à tabela sem prefixo
      // Usar negative lookbehind para não substituir se já tem prefixo
      const tableRegex = new RegExp(`\\b(?<!inep\\.)${tableName}\\b`, 'gi')

      // Substituir por versão com prefixo
      processedSQL = processedSQL.replace(tableRegex, `inep.${tableName}`)
    })

    return processedSQL
  }

  /**
   * Prepara um resumo dos resultados para o prompt de explicação
   */
  private prepareResultSummary(result: QueryResult): string {
    if (!result.success) {
      return `Erro: ${result.error}`
    }

    if (!result.rows || !result.columns || result.rows.length === 0) {
      return 'Nenhum registro encontrado'
    }

    const rowCount = result.rowCount || result.rows.length
    const columns = result.columns

    // Mostrar algumas amostras dos dados para o modelo entender o contexto
    const sampleRows = result.rows.slice(0, 3) // Primeiras 3 linhas
    let summary = `${rowCount} registros encontrados\n`
    summary += `Colunas: ${columns.join(', ')}\n`
    summary += `Amostra dos dados:\n`

    sampleRows.forEach((row, index) => {
      summary += `Registro ${index + 1}: `
      columns.forEach((col, colIndex) => {
        summary += `${col}=${row[colIndex]} `
      })
      summary += '\n'
    })

    if (rowCount > 3) {
      summary += `... e mais ${rowCount - 3} registros`
    }

    return summary
  }

  /**
   * Formata o resultado da query para exibição
   */
  private formatQueryResult(result: QueryResult): string {
    if (!result.success) {
      return 'Erro na execução da consulta.'
    }

    if (!result.rows || !result.columns || result.rows.length === 0) {
      return 'Nenhum registro encontrado.'
    }

    const { columns, rows } = result
    const totalRows = result.rowCount || rows.length

    // Limitar a 10 registros para não sobrecarregar a resposta
    const limitedRows = rows.slice(0, 10)

    // Criar tabela simples
    let table = columns.join(' | ') + '\n'
    table += columns.map(() => '---').join(' | ') + '\n'

    limitedRows.forEach(row => {
      table += row.map(cell => String(cell || '')).join(' | ') + '\n'
    })

    if (totalRows > 10) {
      table += `\n... e mais ${totalRows - 10} registros.`
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
    const prompt = `Você é um especialista em dados educacionais do INEP. O usuário perguntou: "${question}"

📊 **BANCO DE DADOS EDUCACIONAIS INEP**
- Total de tabelas: ${totalTables}
- Fonte: Instituto Nacional de Estudos e Pesquisas Educacionais
- Cobertura: Ensino superior brasileiro

🗂️ **PRINCIPAIS TABELAS:**
${tablesInfo}

🔗 **RELACIONAMENTOS:**
${schema.relationships?.map((rel: any) => `- ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}`).join('\n') || 'Relacionamentos entre tabelas detectados automaticamente'}

**INSTRUÇÕES:**
Responda de forma clara e útil sobre nossos dados educacionais. Destaque:
- Que tipos de informações educacionais temos disponíveis
- Como as tabelas se relacionam
- Exemplos práticos de perguntas que podem ser feitas
- Use emojis e markdown para clareza
- Seja informativo mas conciso (máximo 250 palavras)
- Foque no potencial analítico dos dados do INEP

**Resposta:**`

    try {
      const llmResponse = await this.llmService.handlePrompt({
        prompt,
        model: 'llama-3.3-70b-versatile'
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
