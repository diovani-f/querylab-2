// Carregar variáveis de ambiente PRIMEIRO
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'

// Importar rotas
import authRoutes from './routes/auth'
import chatRoutes from './routes/chat'
import healthRoutes from './routes/health'
import sessionsRoutes from './routes/sessions'
import historyRoutes from './routes/history'
import evaluationRoutes from './routes/evaluation'
import schemaDiscoveryRoutes from './routes/schema-discovery'
import testResultsRoutes from './routes/test-results'

// Importar WebSocket handlers
import { setupWebSocketHandlers } from './websockets/handlers'

// Importar serviços
import { DatabaseService } from './services/database-service'
import { QueryDatabaseService } from './services/query-database-service'
import { LLMService } from './services/llm-service'

// Variáveis de ambiente já carregadas no topo

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 5000

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000', // front local
  'https://querylab-2.onrender.com' // front em producao
];

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}))
app.use(helmet())
app.use(morgan('combined'))
app.use(express.json())

// Rotas
app.use('/api/auth', authRoutes)
app.use('/api/health', healthRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/evaluation', evaluationRoutes)
app.use('/api/schema', schemaDiscoveryRoutes)
app.use('/api/test-results', testResultsRoutes)

// Setup WebSocket handlers
setupWebSocketHandlers(io)

// Make io instance available globally for routes
declare global {
  var socketIO: Server
}
global.socketIO = io

// Inicializar serviços
async function initializeServices() {
  try {
    // Inicializar DatabaseService (auth, sessões)
    const dbService = DatabaseService.getInstance()
    await dbService.initialize()

    // Inicializar QueryDatabaseService (consultas SQL)
    const queryDbService = QueryDatabaseService.getInstance()
    await queryDbService.initialize()

    const llmService = LLMService.getInstance()
    llmService.populateModels();

    console.log('✅ Serviços inicializados com sucesso')
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços:', error)
  }
}

// Iniciar servidor
server.listen(PORT, async () => {
  console.log(`🚀 Servidor QueryLab rodando na porta ${PORT}`)

  // Inicializar serviços
  await initializeServices()
})

export { io }
