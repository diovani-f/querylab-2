import Groq from 'groq-sdk'
import { LLMModel, LLMProvider, LLMRequest, LLMResponse } from '../types'

export class LLMService {
  private static instance: LLMService
  private groqClient: Groq
  private availableModels: LLMModel[]

  private constructor() {
    // Inicializar cliente Groq
    this.groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })

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
    const { prompt, model, context } = request

    try {

      // Construir prompt otimizado para text-to-SQL
      const systemPrompt = this.buildSystemPrompt(context)
      const userPrompt = this.buildUserPrompt(prompt)

      console.log(`🤖 Enviando consulta para ${model}: ${prompt}`)

      const completion = await this.groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: model,
        temperature: 0.1, // Baixa temperatura para SQL mais preciso
        max_tokens: 1000,
        top_p: 1,
        stream: false
      })

      const response = completion.choices[0]?.message?.content

      if (!response) {
        throw new Error('Resposta vazia do modelo LLM')
      }

      // Verificar se é uma explicação ou SQL
      if (response.startsWith('EXPLICAÇÃO:')) {
        console.log(`💬 Explicação gerada: ${response}`)

        return {
          success: true,
          explanation: response.replace('EXPLICAÇÃO:', '').trim(),
          model: model,
          tokensUsed: completion.usage?.total_tokens || 0,
          processingTime: Date.now()
        }
      } else {
        // Extrair SQL da resposta
        const sqlQuery = this.extractSQL(response)

        console.log(`✅ SQL gerado: ${sqlQuery}`)

        return {
          success: true,
          sqlQuery,
          explanation: response,
          model: model,
          tokensUsed: completion.usage?.total_tokens || 0,
          processingTime: Date.now()
        }
      }

    } catch (error) {
      console.error('❌ Erro ao gerar SQL:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        model: model,
        tokensUsed: 0,
        processingTime: Date.now()
      }
    }
  }

  private buildSystemPrompt(context?: any): string {
    return `Você é um assistente especializado em consultas SQL para um banco de dados universitário.

REGRAS IMPORTANTES:
1. Se a mensagem for uma saudação (oi, olá, hello, etc.) ou pergunta geral sobre o que você faz, responda SEMPRE com "EXPLICAÇÃO:" seguido da explicação
2. Se for uma consulta específica sobre dados (quantas, liste, mostre, etc.), gere APENAS o SQL válido
3. NUNCA misture explicação com SQL

SCHEMA DO BANCO DE DADOS:
- universidades: id, nome, sigla, tipo, regiao, estado, cidade, fundacao, campus, alunos_total, professores_total, cursos_graduacao, cursos_pos_graduacao
- pessoas: id, nome, tipo, universidade_id, departamento, curso, titulacao, area_pesquisa, email
- cursos: id, nome, tipo, universidade_id, departamento, duracao, vagas_anuais, nota_corte, modalidade
- regioes: id, nome, estados, populacao, universidades_federais, estaduais, privadas

EXEMPLOS CORRETOS:

Entrada: "oi"
Saída: EXPLICAÇÃO: Olá! Sou um assistente especializado em consultas SQL para dados universitários. Posso ajudar você a encontrar informações sobre universidades, cursos, professores e alunos. Exemplos: "Quantas universidades federais existem?", "Liste os cursos de engenharia", "Mostre as universidades do Rio de Janeiro".

Entrada: "Quantas universidades federais existem?"
Saída: SELECT COUNT(*) as total FROM universidades WHERE tipo = 'Federal';

Entrada: "o que você faz?"
Saída: EXPLICAÇÃO: Sou especializado em converter suas perguntas em consultas SQL para buscar dados universitários. Posso ajudar com informações sobre universidades, cursos, professores e alunos.`
  }

  private buildUserPrompt(prompt: string): string {
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
}
