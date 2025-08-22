export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: Date
  sqlQuery?: string
  queryResult?: QueryResult
  hasExplanation?: boolean // Flag para indicar se a mensagem tem explicação textual
  explanation?: string // Explicação detalhada da consulta
  reverseTranslation?: string // Tradução reversa do SQL para linguagem natural
}

export interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
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
  overallComment?: string

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
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  model: LLMModel
}

export type LLMProvider = 'groq' | 'openai' | 'anthropic' | 'local'

export interface LLMModel {
  id: string
  name: string
  description: string
  provider: LLMProvider
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
  id: number | string
  nome: string
  email: string
  senha: string
  role: 'admin' | 'user'
  avatar?: string
  created_at: string
  updated_at: string
  last_login?: string
  is_active: boolean
  preferences: {
    theme: 'light' | 'dark'
    language: string
    default_model: string
  }
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
  userId: number | string
  email: string
  role: string
  iat?: number
  exp?: number
}

import { Request } from 'express'

export interface AuthRequest extends Request {
  user?: Omit<User, 'senha'>
}

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
  'send-message': (data: ChatRequest) => void
  'disconnect-session': (sessionId: string) => void

  // Server to Client
  'message-received': (message: Message) => void
  'message-processing': (status: string) => void
  'session-joined': (sessionId: string) => void
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
  explanation?: string
  reverseTranslation?: string
  error?: string
  model: string
  tokensUsed: number
  processingTime: number
}

export interface LLMAdapter {
  generateSQL(prompt: string, schema?: any): Promise<string>
  isAvailable(): boolean
}
