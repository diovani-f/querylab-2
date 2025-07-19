import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

// Importar rotas
import authRoutes from './routes/auth'
import chatRoutes from './routes/chat'
import healthRoutes from './routes/health'
import sessionsRoutes from './routes/sessions'
import historyRoutes from './routes/history'
import favoritesRoutes from './routes/favorites'

// Importar WebSocket handlers
import { setupWebSocketHandlers } from './websockets/handlers'

// Importar serviços
import { DatabaseService } from './services/database-service'
import { SessionService } from './services/session-service'

// Carregar variáveis de ambiente
dotenv.config()

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

// Setup WebSocket handlers
setupWebSocketHandlers(io)

// Inicializar serviços
async function initializeServices() {
  try {
    // Inicializar DatabaseService
    const dbService = DatabaseService.getInstance()
    await dbService.initialize()

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
  console.log(`📡 WebSocket habilitado`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)

  // Inicializar serviços
  await initializeServices()
})

export { io }
