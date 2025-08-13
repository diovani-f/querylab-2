import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { DB2Service } from './services/db2-service'
import { healthRoutes } from './routes/health'
import { queryRoutes } from './routes/query'

// Carregar variáveis de ambiente
dotenv.config()

const app = express()
const PORT = process.env.DB2_SERVICE_PORT || 5001

// Middlewares
app.use(cors())
app.use(express.json())

// Rotas
app.use('/health', healthRoutes)
app.use('/query', queryRoutes)

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    service: 'QueryLab DB2 Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      query: '/query'
    }
  })
})

// Inicializar serviço DB2
async function initializeDB2Service() {
  try {
    const db2Service = DB2Service.getInstance()
    await db2Service.initialize()
    console.log('✅ DB2 Service inicializado com sucesso')
  } catch (error) {
    console.error('❌ Erro ao inicializar DB2 Service:', error)
    process.exit(1)
  }
}

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 DB2 Service rodando na porta ${PORT}`)
  await initializeDB2Service()
})

export default app
