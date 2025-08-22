export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: Date
  sqlQuery?: string
  queryResult?: QueryResult
  evaluation?: QueryEvaluation
  hasExplanation?: boolean // Flag para indicar se tem explicação textual
  explanation?: string // Explicação detalhada da consulta
  reverseTranslation?: string // Tradução reversa do SQL para linguagem natural
}

export interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
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
  user?: User
  token?: string
  message?: string
  error?: string
}

export interface ChatRequest {
  sessionId: string
  message: string
  model?: string
  userId?: number | string
}

export interface AppState {
  currentSession: ChatSession | null
  sessions: ChatSession[]
  availableModels: LLMModel[]
  selectedModel: LLMModel | null
  databaseConnection: DatabaseConnection | null
  isConnected: boolean
  user: User | null
  isProcessing: boolean
}

export interface ChatResponse {
  success: boolean
  message?: Message
  error?: string
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
