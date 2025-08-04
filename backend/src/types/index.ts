export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: Date
  sqlQuery?: string
  queryResult?: QueryResult
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
  error?: string
  model: string
  tokensUsed: number
  processingTime: number
}

export interface LLMAdapter {
  generateSQL(prompt: string, schema?: any): Promise<string>
  isAvailable(): boolean
}
