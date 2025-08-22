import Groq from 'groq-sdk'
import axios from 'axios'
import { LLMModel, LLMProvider, LLMRequest, LLMResponse } from '../types'
import { SchemaDiscoveryService } from './schema-discovery-service'

export class LLMService {
  private static instance: LLMService
  private groqClient: Groq
  private availableModels: LLMModel[]
  private schemaService: SchemaDiscoveryService

  private constructor() {
    // Verificar se a API key está disponível
    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY é obrigatória! Verifique o arquivo .env')
    }

    // Inicializar cliente Groq
    this.groqClient = new Groq({
      apiKey: groqApiKey
    })

    // Inicializar serviço de schema discovery
    this.schemaService = SchemaDiscoveryService.getInstance()

  // Definir modelos disponíveis (atualizados para modelos ativos)
    this.availableModels = [
      {
        id: 'llama3-70b-8192',
        name: 'Llama 3 70B',
        provider: 'groq' as LLMProvider,
        description: 'Modelo mais poderoso para tarefas complexas',
        maxTokens: 8192,
        isDefault: true
      },
      {
        id: 'llama3-8b-8192',
        name: 'Llama 3 8B',
        provider: 'groq' as LLMProvider,
        description: 'Modelo rápido para consultas simples',
        maxTokens: 8192,
        isDefault: false
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        provider: 'groq' as LLMProvider,
        description: 'Excelente para análise de código e SQL',
        maxTokens: 32768,
        isDefault: false
      },
      {
        id: 'gemma-7b-it',
        name: 'Gemma 7B',
        provider: 'groq' as LLMProvider,
        description: 'Modelo eficiente do Google',
        maxTokens: 8192,
        isDefault: false
      },
      {
        id: 'sqlcoder-7b-2',
        name: 'SQLCoder 7B-2',
        provider: 'local' as LLMProvider,
        description: 'Modelo especializado em SQL rodando via Python',
        maxTokens: 4096,
        isDefault: false
      }
    ]
  }

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService()
    }
    return LLMService.instance
  }

  getAvailableModels(): LLMModel[] {
    return this.availableModels
  }

  getDefaultModel(): LLMModel {
    return this.availableModels.find(model => model.isDefault) || this.availableModels[0]
  }

  async generateSQL(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, model, context } = request;
    try {
      const systemPrompt = await this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(prompt);

      // Se for o modelo sqlcoder-7b-2, chama o endpoint Python via axios
      if (model === 'sqlcoder-7b-2') {
        const response = await axios.post(`${process.env.NGROK_MODEL_URL}/generate_sql`, {
          system_prompt: systemPrompt,
          user_prompt: userPrompt
        });
        const data = response.data;
        return {
          success: true,
          sqlQuery: data.sql,
          reverseTranslation: data.reverse_translation || this.generateReverseTranslation(prompt, data.sql),
          explanation: undefined, // só retorna quando solicitado
          model,
          tokensUsed: 0,
          processingTime: Date.now()
        };
      }

      // Modelos padrão (Groq)
      const completion = await this.groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: model,
        temperature: 0.1,
        max_tokens: 1000,
        top_p: 1,
        stream: false
      });
      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Resposta vazia do modelo LLM');
      }
      // Se a resposta for conversacional (começa com EXPLICAÇÃO:), não tentar extrair SQL
      if (response.trim().startsWith('EXPLICAÇÃO:')) {
        return {
          success: true,
          sqlQuery: undefined,
          reverseTranslation: undefined,
          explanation: response.trim(),
          model,
          tokensUsed: completion.usage?.total_tokens || 0,
          processingTime: Date.now()
        };
      }
      // Extrair SQL da resposta normalmente
      const sqlQuery = this.extractSQL(response);
      // Gerar tradução reversa simples
      const reverseTranslation = this.generateReverseTranslation(prompt, sqlQuery);
      return {
        success: true,
        sqlQuery,
        reverseTranslation,
        explanation: undefined,
        model,
        tokensUsed: completion.usage?.total_tokens || 0,
        processingTime: Date.now()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar SQL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        model: model,
        tokensUsed: 0,
        processingTime: Date.now()
      };
    }
  }

  public async buildSystemPrompt(context?: any): Promise<string> {
  // Obter schema real do banco de dados
  const schemaInfo = await this.schemaService.getSchemaForLLM(context?.schemaName || 'INEP');
  const basePrompt = `Você é um assistente especializado em consultas SQL para banco de dados DB2, mas também pode conversar normalmente com o usuário.

REGRAS IMPORTANTES:
1. Se a mensagem for uma saudação (oi, olá, hello, etc.) ou pergunta geral sobre o que você faz, responda SEMPRE com "EXPLICAÇÃO:" seguido da explicação. Mantenha a conversa natural e amigável.
2. Se for uma consulta específica sobre dados (quantas, liste, mostre, etc.), gere APENAS o SQL válido.
3. NUNCA misture explicação com SQL.
4. Use SEMPRE nomes de tabelas e colunas EXATOS como mostrados no schema.
5. Para DB2, use sintaxe específica: FETCH FIRST n ROWS ONLY ao invés de LIMIT.
6. Sempre prefixe o nome da tabela com o schema INEP (ex: INEP.CENSO_IES).
7. Se o schema não estiver disponível, avise o usuário e gere consultas genéricas.
8. Mantenha a conversa fluida e educada quando não for uma consulta SQL.

SCHEMA DO BANCO DE DADOS:`;
  if (schemaInfo && schemaInfo.tables && schemaInfo.tables.length > 0) {
    const schemaDescription = schemaInfo.tables.map((table: any) => {
    const keyColumns = table.keyColumns?.map((col: any) => `${col.name} (${col.dataType})${col.nullable ? ' NULL' : ' NOT NULL'}`).join(', ') || '';
    const importantColumns = table.importantColumns?.map((col: any) => `${col.name} (${col.dataType})${col.nullable ? ' NULL' : ' NOT NULL'}`).join(', ') || '';
    return `- ${table.name}: ${table.columnCount} colunas
  Chaves: ${keyColumns}
  Colunas importantes: ${importantColumns}
  Tipo: ${table.type}${table.comment ? ` - ${table.comment}` : ''}`;
    }).join('\n');
    return `${basePrompt}
${schemaDescription}

RELACIONAMENTOS IDENTIFICADOS:
${schemaInfo.relationships?.map((rel: any) => `- ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable} (${rel.type})`).join('\n') || 'Nenhum relacionamento identificado'}

EXEMPLOS CORRETOS:

Entrada: "oi"
Saída: EXPLICAÇÃO: Olá! Sou um assistente especializado em consultas SQL para dados do INEP. Posso ajudar você a encontrar informações sobre instituições de ensino, cursos, avaliações e indicadores educacionais. Exemplos: "Quantas instituições existem?", "Liste os cursos de uma área específica", "Mostre dados de avaliação".

Entrada: "Quantas instituições existem?"
Saída: SELECT COUNT(*) as total FROM ${context?.schemaName || 'INEP'}.${schemaInfo.tables[0]?.name || 'TABELA'};

Entrada: "Liste 10 cursos"
Saída: SELECT SOME_COLUMN_NAME FROM ${context?.schemaName || 'INEP'}.${schemaInfo.tables[0]?.name || 'TABELA'} FETCH FIRST 10 ROWS ONLY;

Entrada: "o que você faz?"
Saída: EXPLICAÇÃO: Sou especializado em converter suas perguntas em consultas SQL para buscar dados educacionais do INEP. Posso ajudar com informações sobre instituições, cursos, avaliações e indicadores.

Entrada: "Me conte mais sobre você"
Saída: EXPLICAÇÃO: Sou um assistente virtual focado em ajudar com consultas SQL e também posso conversar normalmente para tirar dúvidas ou explicar como funciono.
`;
  }
  // Fallback para schema básico se não conseguir carregar
  return `${basePrompt}
- Schema não disponível no momento. Use consultas genéricas.

EXEMPLOS CORRETOS:

Entrada: "oi"
Saída: EXPLICAÇÃO: Olá! Sou um assistente especializado em consultas SQL. No momento, o schema detalhado não está disponível, mas posso ajudar com consultas básicas.

Entrada: "o que você faz?"
Saída: EXPLICAÇÃO: Sou especializado em converter suas perguntas em consultas SQL. No momento, estou com acesso limitado ao schema do banco.
`;
  }

  // Gera tradução reversa simples para o SQL
  private generateReverseTranslation(prompt: string, sql: string): string {
    if (!sql) return '';
    // Exemplo simples: "Busquei X em Y filtrando por Z..."
    // Pode ser melhorado com NLP, mas aqui é só para garantir o formato
    return `Tradução reversa: Busquei dados conforme solicitado: "${prompt}".`;
  }

  public buildUserPrompt(prompt: string): string {
    return `Converta esta consulta em linguagem natural para SQL:

"${prompt}"

Retorne apenas o SQL válido:`
  }

  private extractSQL(response: string): string {
    // Tentar extrair SQL de blocos de código
    const sqlBlockMatch = response.match(/```sql\n([\s\S]*?)\n```/)
    if (sqlBlockMatch) {
      return sqlBlockMatch[1].trim()
    }

    // Tentar extrair SQL de blocos genéricos
    const codeBlockMatch = response.match(/```\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // Se não encontrar blocos, procurar por SQL direto
    const lines = response.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.toUpperCase().startsWith('SELECT') ||
          trimmed.toUpperCase().startsWith('INSERT') ||
          trimmed.toUpperCase().startsWith('UPDATE') ||
          trimmed.toUpperCase().startsWith('DELETE')) {
        return trimmed
      }
    }

    // Fallback: retornar a resposta completa limpa
    return response.trim()
  }

  /**
   * Gera explicação textual dos resultados de uma consulta
   */
  async generateExplanation(params: {
    query: string
    result: any
    originalPrompt: string
  }): Promise<{ success: boolean; explanation?: string; error?: string }> {
    try {
      const { query, result, originalPrompt } = params

      // Criar prompt para explicação
      const explanationPrompt = `
Você é um assistente especializado em análise de dados universitários.

PERGUNTA ORIGINAL DO USUÁRIO:
"${originalPrompt}"

CONSULTA SQL EXECUTADA:
\`\`\`sql
${query}
\`\`\`

RESULTADOS OBTIDOS:
- Número de registros: ${result.rowCount}
- Colunas: ${result.columns.join(', ')}
- Tempo de execução: ${result.executionTime}ms

DADOS (primeiras 5 linhas):
${result.rows.slice(0, 5).map((row: any[], index: number) =>
  `${index + 1}. ${result.columns.map((col: string, i: number) => `${col}: ${row[i]}`).join(', ')}`
).join('\n')}

INSTRUÇÕES:
1. Responda em português brasileiro
2. Explique os resultados de forma clara e didática
3. Destaque insights importantes dos dados
4. Mencione o número total de registros encontrados
5. Se houver dados interessantes, comente sobre eles
6. Mantenha um tom conversacional e educativo
7. NÃO repita o SQL na resposta
8. Foque na interpretação dos dados, não na consulta técnica

Forneça uma explicação completa e útil dos resultados:
`

      const response = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: explanationPrompt
          }
        ],
        model: 'llama3-70b-8192',
        temperature: 0.7,
        max_tokens: 1000
      })

      const explanation = response.choices[0]?.message?.content?.trim()

      if (!explanation) {
        return {
          success: false,
          error: 'Não foi possível gerar explicação'
        }
      }

      return {
        success: true,
        explanation
      }

    } catch (error) {
      console.error('Erro ao gerar explicação:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
}
