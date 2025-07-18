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

export interface LLMAdapter {
  generateSQL(prompt: string, schema?: any): Promise<string>
  isAvailable(): boolean
}
