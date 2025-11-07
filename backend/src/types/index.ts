export interface Message {
  id: string
  tipo: string
  conteudo: string
  timestamp: Date
  sqlQuery?: string | null
  queryResult?: QueryResult | null
  hasExplanation?: boolean | null // Flag para indicar se a mensagem tem explicação textual
  explanation?: string | null // Explicação detalhada da consulta
  reverseTranslation?: string | null // Tradução reversa do SQL para linguagem natural
}

export interface QueryResult {
  columns?: string[] | null;
  rows?: any[][] | null;
  rowCount?: number | null;
  executionTime?: number | null;
  success?: Boolean | null;
  error?: string | null;
  data?: any | null;
}

// Sistema de Avaliação de Retornos LLM
export interface EvaluationCriteria {
  id: string
  name: string
  description: string
  weight: number // Peso da avaliação (0-1)
  type: 'boolean' | 'scale' | 'text'
  scaleMin?: number
  scaleMax?: number
}

export interface QueryEvaluation {
  id: string
  sessionId: string
  messageId: string
  evaluatorId: string
  evaluatorName: string
  timestamp: Date

  // Dados da consulta
  originalQuery: string
  generatedSQL: string
  queryResult: QueryResult

  // Avaliações por critério
  criteriaEvaluations: {
    criteriaId: string
    value: boolean | number | string
    comment?: string
  }[]

  // Avaliação geral
  overallScore: number // 0-10
  overallComment?: string | null

  // Flags
  isCorrect: boolean
  needsReview: boolean
  isApproved: boolean
}

export interface EvaluationSummary {
  totalEvaluations: number
  averageScore: number
  correctnessRate: number
  approvalRate: number
  criteriaAverages: {
    criteriaId: string
    average: number
  }[]
}

export interface ChatSession {
  id: string
  titulo: string
  createdAt: Date
  updatedAt: Date
  mensagens: Message[]
  modelo: LLMModel
}

export type LLMProvider = 'gemini' | 'groq' | 'openai' | 'anthropic' | 'local' | 'replicate' | 'cloudflare'

export interface LLMModel {
  id: string
  name: string
  description: string | null
  provider: LLMProvider | string
  maxTokens: number
  isDefault: boolean
}

export interface DatabaseConnection {
  id: string
  name: string
  type: 'db2' | 'json-server'
  status: 'connected' | 'disconnected' | 'error'
  lastConnected?: Date
}

export interface User {
  id: string
  nome: string
  email: string
  senha: string
  role: string
  avatar?: string | null
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  isActive: boolean
  preferences: any
}

export interface UserRegistration {
  nome: string
  email: string
  senha: string
}

export interface UserLogin {
  email: string
  senha: string
}

export interface AuthResponse {
  success: boolean
  user?: Omit<User, 'senha'>
  token?: string
  message?: string
  error?: string
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

import { Request } from 'express'

export type AuthRequest = Request & {
  user?: Omit<User, 'senha'>;
};

export interface ChatRequest {
  sessionId: string
  message: string
  model: string
}

export interface ChatResponse {
  success: boolean
  message?: Message
  error?: string
}

export interface WebSocketEvents {
  // Client to Server
  'join-session': (sessionId: string) => void
  'send-message': (data: ChatRequest & { useParallelMode?: boolean }) => void
  'execute-query': (data: { messageId: string, sessionId: string }) => void
  'disconnect-session': (sessionId: string) => void

  // Server to Client
  'message-received': (message: Message) => void
  'message-updated': (message: Message) => void
  'message-processing': (status: string) => void
  'sql-parallel-generating': (data: { status: string, results?: any[] }) => void
  'query-executing': (status: string) => void
  'query-error': (error: string) => void
  'session-joined': (sessionId: string) => void
  'session-title-updated': (data: { sessionId: string, title: string }) => void
  'evaluation-updated': (data: { messageId: string, evaluation: QueryEvaluation }) => void
  'error': (error: string) => void
}

export interface DatabaseAdapter {
  connect(): Promise<void>
  query(sql: string): Promise<QueryResult>
  disconnect(): Promise<void>
  testConnection(): Promise<boolean>
}

export interface LLMRequest {
  prompt: string
  model: string
  context?: any
  maxTokens?: number
  temperature?: number
}

export interface LLMResponse {
  success: boolean
  sqlQuery?: string
  content?: string | null
  explanation?: string
  reverseTranslation?: string
  error?: string
  model?: string
  provider?: LLMProvider
  tokensUsed?: number
  processingTime?: number
  isRateLimit?: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface LLMAdapter {
  generateSQL(prompt: string, schema?: any): Promise<string>
  isAvailable(): boolean
}
