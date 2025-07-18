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

export interface LLMModel {
  id: string
  name: string
  description: string
  provider: 'openai' | 'anthropic' | 'local'
  isAvailable: boolean
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
  name: string
  email: string
  role: 'admin' | 'user'
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
