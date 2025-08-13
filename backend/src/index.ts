// Carregar variáveis de ambiente PRIMEIRO
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'

// Importar rotas
import authRoutes from './routes/auth'
import chatRoutes from './routes/chat'
import healthRoutes from './routes/health'
import sessionsRoutes from './routes/sessions'
import historyRoutes from './routes/history'
import favoritesRoutes from './routes/favorites'
import evaluationRoutes from './routes/evaluation'

// Importar WebSocket handlers
import { setupWebSocketHandlers } from './websockets/handlers'

// Importar serviços
import { DatabaseService } from './services/database-service'
import { SessionService } from './services/session-service'
import { QueryDatabaseService } from './services/query-database-service'

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

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))
app.use(express.json())

// Rotas
app.use('/api/auth', authRoutes)
app.use('/api/health', healthRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api/evaluation', evaluationRoutes)

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
    // Inicializar DatabaseService (JSON Server - auth, sessões)
    const dbService = DatabaseService.getInstance()
    await dbService.initialize()

    // Inicializar QueryDatabaseService (DB2 - consultas SQL)
    const queryDbService = QueryDatabaseService.getInstance()
    await queryDbService.initialize()

    // Inicializar SessionService
    const sessionService = SessionService.getInstance()
    await sessionService.loadSessions()

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
