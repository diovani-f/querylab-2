# QueryLab Backend Principal

Backend principal do QueryLab, responsável por autenticação, sessões, WebSocket e comunicação com LLMs. **Não contém dependências nativas** para facilitar o deploy.

## 🏗️ Arquitetura

Este backend funciona como o núcleo da aplicação:
- **Autenticação e Sessões**: Gerenciadas via JSON Server
- **WebSocket**: Comunicação em tempo real com frontend
- **LLM Integration**: Processamento de linguagem natural
- **Query Proxy**: Comunica com DB2 Service via HTTP

## 🚀 Instalação e Execução

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env conforme necessário

# Executar em modo desenvolvimento
npm run dev

# Ou compilar e executar
npm run build
npm start
```

### Docker

```bash
# Build da imagem
docker build -t querylab-backend .

# Executar container
docker run -p 5000:5000 \
  -e GROQ_API_KEY=your_key \
  -e DB2_SERVICE_URL=http://db2-service:5001 \
  querylab-backend
```

## ⚙️ Configuração

### Variáveis de Ambiente Principais

```env
# Servidor
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Banco da Aplicação
DB_TYPE=json-server
JSON_SERVER_URL=http://localhost:3001

# Consultas SQL
QUERY_DB_TYPE=db2-http
DB2_SERVICE_URL=http://localhost:5001

# LLM
GROQ_API_KEY=your_groq_api_key_here
```

### Tipos de Banco Suportados

1. **Aplicação** (`DB_TYPE`):
   - `json-server`: Para desenvolvimento e dados de sessão

2. **Consultas** (`QUERY_DB_TYPE`):
   - `db2-http`: Comunica com DB2 Service via HTTP
   - `json-server`: Fallback para desenvolvimento

## 📡 Integração com DB2 Service

O backend se comunica com o DB2 Service através do `DB2HttpAdapter`:

```typescript
// Configuração automática baseada em QUERY_DB_TYPE
const adapter = new DB2HttpAdapter(process.env.DB2_SERVICE_URL)
```

### Endpoints do DB2 Service

- `POST /query/execute` - Executar SQL
- `GET /query/test` - Testar conexão
- `GET /health` - Status do serviço

## 🔄 Fluxo de Consultas

```
Frontend → WebSocket → Backend Principal → HTTP → DB2 Service → IBM DB2
```

1. Frontend envia pergunta via WebSocket
2. Backend processa com LLM (gera SQL)
3. Backend envia SQL para DB2 Service
4. DB2 Service executa no IBM DB2
5. Resultado retorna via WebSocket

## 📊 APIs Disponíveis

### Health Check
- `GET /api/health` - Status básico
- `GET /api/health/database` - Status do banco da aplicação
- `GET /api/health/status` - Status completo dos serviços

### Chat
- `POST /api/chat/message` - Enviar mensagem
- WebSocket events: `send-message`, `message-received`

### Sessões
- `GET /api/sessions` - Listar sessões
- `POST /api/sessions` - Criar sessão
- `PUT /api/sessions/:id` - Atualizar sessão
- `DELETE /api/sessions/:id` - Deletar sessão

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Perfil do usuário

## 🐳 Deploy

### Ambientes Suportados

Este backend pode ser deployado em **qualquer ambiente** que suporte Node.js:
- Railway ✅
- Vercel ✅
- Heroku ✅
- AWS/GCP/Azure ✅
- VPS/Servidor próprio ✅

### Configuração de Produção

```env
NODE_ENV=production
DB2_SERVICE_URL=https://your-db2-service.com
JSON_SERVER_URL=https://your-json-server.com
GROQ_API_KEY=your_production_key
```

## 🔧 Desenvolvimento

### Scripts Disponíveis

- `npm run dev` - Desenvolvimento com hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Executar versão compilada

### Estrutura do Projeto

```
backend/
├── src/
│   ├── adapters/         # Database adapters
│   │   ├── json-server-adapter.ts
│   │   └── db2-http-adapter.ts
│   ├── routes/           # Express routes
│   ├── services/         # Business logic
│   ├── websockets/       # Socket.io handlers
│   └── types/            # TypeScript types
├── package.json
├── tsconfig.json
└── Dockerfile
```

## 🔒 Segurança

- JWT para autenticação
- CORS configurado
- Validação de entrada
- Rate limiting (recomendado em produção)

## 📝 Logs

O backend produz logs estruturados:

```
🚀 Servidor QueryLab rodando na porta 5000
✅ DatabaseService inicializado com json-server
✅ QueryDatabaseService inicializado com db2-http
📨 Mensagem recebida via WebSocket
```

## 🔗 Dependências Principais

- **express**: Servidor HTTP
- **socket.io**: WebSocket
- **axios**: Cliente HTTP para DB2 Service
- **groq-sdk**: Integração com LLM
- **jsonwebtoken**: Autenticação JWT

## 🚨 Troubleshooting

### DB2 Service não disponível
- Backend automaticamente usa JSON Server como fallback
- Verifique `DB2_SERVICE_URL` nas variáveis de ambiente

### Erro de CORS
- Configure `FRONTEND_URL` corretamente
- Verifique se frontend e backend estão nas URLs esperadas

### WebSocket não conecta
- Verifique se as portas estão abertas
- Confirme configuração de proxy em produção
