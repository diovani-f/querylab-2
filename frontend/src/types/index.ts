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
  id: number
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
  userId?: number
}

export interface AppState {
  currentSession: ChatSession | null
  sessions: ChatSession[]
  availableModels: LLMModel[]
  selectedModel: LLMModel | null
  databaseConnection: DatabaseConnection | null
  isConnected: boolean
  user: User | null
}



export interface ChatResponse {
  success: boolean
  message?: Message
  error?: string
}
