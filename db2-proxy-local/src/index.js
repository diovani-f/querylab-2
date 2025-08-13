const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const dotenv = require('dotenv')
const ibmdb = require('ibm_db')

// Carregar variáveis de ambiente
dotenv.config()

const app = express()
const PORT = process.env.PROXY_PORT || 3002
const SECRET = process.env.PROXY_SECRET

// Configurações de segurança
app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Rate limiting simples
const requestCounts = new Map()
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_REQUESTS || '100')
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW || '900000') // 15 min

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, [])
  }
  
  const requests = requestCounts.get(ip).filter(time => time > windowStart)
  
  if (requests.length >= RATE_LIMIT) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(WINDOW_MS / 1000)
    })
  }
  
  requests.push(now)
  requestCounts.set(ip, requests)
  next()
}

app.use(rateLimit)

// Middleware de autenticação
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização necessário' })
  }
  
  const token = authHeader.substring(7)
  
  if (token !== SECRET) {
    return res.status(403).json({ error: 'Token inválido' })
  }
  
  next()
}

// Configuração do DB2
const db2Config = {
  host: process.env.DB2_HOST,
  port: parseInt(process.env.DB2_PORT || '50000'),
  database: process.env.DB2_DATABASE,
  username: process.env.DB2_USERNAME,
  password: process.env.DB2_PASSWORD,
  ssl: process.env.DB2_SSL_ENABLED === 'true',
  connectTimeout: parseInt(process.env.DB2_CONNECTION_TIMEOUT || '30000'),
  queryTimeout: parseInt(process.env.DB2_QUERY_TIMEOUT || '60000')
}

function buildConnectionString() {
  let connStr = `DATABASE=${db2Config.database};HOSTNAME=${db2Config.host};PORT=${db2Config.port};PROTOCOL=TCPIP;UID=${db2Config.username};PWD=${db2Config.password};`
  
  if (db2Config.ssl) {
    connStr += 'SECURITY=SSL;'
  }
  
  return connStr
}

const connectionString = buildConnectionString()

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DB2 Proxy Local',
    timestamp: new Date().toISOString(),
    vpnConnected: true // Você pode implementar uma verificação real aqui
  })
})

// Rota para executar queries (protegida)
app.post('/query', authenticate, async (req, res) => {
  const { sql } = req.body
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query é obrigatória' })
  }
  
  const startTime = Date.now()
  let connection = null
  
  try {
    console.log(`🔄 Executando query: ${sql}`)
    
    // Conectar ao DB2
    connection = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout de conexão (${db2Config.connectTimeout}ms)`))
      }, db2Config.connectTimeout)
      
      ibmdb.open(connectionString, (err, conn) => {
        clearTimeout(timeout)
        if (err) {
          reject(err)
        } else {
          resolve(conn)
        }
      })
    })
    
    // Executar query
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout de query (${db2Config.queryTimeout}ms)`))
      }, db2Config.queryTimeout)
      
      connection.query(sql, (err, data) => {
        clearTimeout(timeout)
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
    
    const executionTime = Date.now() - startTime
    
    // Processar resultado
    const processedResult = processQueryResult(result, executionTime)
    
    console.log(`✅ Query executada em ${executionTime}ms - ${processedResult.rowCount} linhas`)
    
    res.json({
      success: true,
      data: processedResult
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error(`❌ Erro na query (${executionTime}ms):`, error.message)
    
    res.status(500).json({
      success: false,
      error: error.message,
      executionTime
    })
  } finally {
    // Fechar conexão
    if (connection) {
      try {
        await new Promise((resolve) => {
          connection.close(() => resolve())
        })
      } catch (closeError) {
        console.error('Erro ao fechar conexão:', closeError)
      }
    }
  }
})

function processQueryResult(data, executionTime) {
  if (!data || data.length === 0) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime
    }
  }
  
  // Extrair nomes das colunas
  const columns = Object.keys(data[0])
  
  // Converter dados para formato de matriz
  const rows = data.map(row => columns.map(col => row[col]))
  
  return {
    columns,
    rows,
    rowCount: data.length,
    executionTime
  }
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 DB2 Proxy Local rodando na porta ${PORT}`)
  console.log(`📡 Conectando ao DB2: ${db2Config.host}:${db2Config.port}`)
  console.log(`🗄️ Database: ${db2Config.database}`)
  console.log(`🔐 Autenticação: ${SECRET ? 'Ativada' : 'DESATIVADA - CONFIGURE PROXY_SECRET!'}`)
})
