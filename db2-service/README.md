# QueryLab DB2 Service

Serviço dedicado para consultas IBM DB2, separado do backend principal para resolver problemas de dependências nativas.

## 🏗️ Arquitetura

Este serviço funciona como um microserviço que:
- Roda em um ambiente com suporte completo ao IBM DB2
- Expõe uma API REST para execução de consultas SQL
- É consumido pelo backend principal via HTTP

## 🚀 Instalação e Execução

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais DB2

# Executar em modo desenvolvimento
npm run dev

# Ou compilar e executar
npm run build
npm start
```

### Docker

```bash
# Build da imagem
docker build -t querylab-db2-service .

# Executar container
docker run -p 5001:5001 \
  -e DB2_HOST=your_host \
  -e DB2_PORT=50000 \
  -e DB2_DATABASE=your_db \
  -e DB2_USERNAME=your_user \
  -e DB2_PASSWORD=your_password \
  querylab-db2-service
```

### Docker Compose

```bash
# Executar com docker-compose (do diretório raiz)
docker-compose up db2-service
```

## 📡 API Endpoints

### Health Check
- `GET /health` - Status básico do serviço
- `GET /health/detailed` - Status detalhado incluindo conexão DB2

### Consultas
- `POST /query/execute` - Executar query SQL
- `GET /query/test` - Testar conexão com DB2
- `GET /query/info` - Informações da conexão

### Exemplos de Uso

```bash
# Testar conexão
curl http://localhost:5001/query/test

# Executar query
curl -X POST http://localhost:5001/query/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1 FROM SYSIBM.SYSDUMMY1"}'

# Health check
curl http://localhost:5001/health/detailed
```

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Porta do serviço
DB2_SERVICE_PORT=5001

# Configuração DB2
DB2_HOST=bi.proj.ufsm.br
DB2_PORT=50000
DB2_DATABASE=bee
DB2_USERNAME=your_username
DB2_PASSWORD=your_password
DB2_SSL_ENABLED=false

# Timeouts
DB2_CONNECTION_TIMEOUT=30000
DB2_QUERY_TIMEOUT=60000
```

## 🔧 Integração com Backend Principal

O backend principal se conecta a este serviço via HTTP usando o `DB2HttpAdapter`:

```typescript
// No backend principal
const adapter = new DB2HttpAdapter('http://localhost:5001')
await adapter.connect()
const result = await adapter.query('SELECT * FROM table')
```

## 🐳 Deploy

### Ambientes Suportados

Este serviço pode ser deployado em qualquer ambiente que suporte:
- Node.js 18+
- Compilação de módulos nativos (gcc, python3, make)
- Conectividade com o servidor DB2

### Recomendações de Deploy

1. **VPS/Servidor Dedicado**: Ideal para máximo controle
2. **Docker**: Usando imagem baseada em Debian/Ubuntu
3. **Kubernetes**: Para ambientes enterprise
4. **Heroku**: Com buildpacks apropriados

### Exemplo de Deploy no Railway

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "npm start"
  }
}
```

## 🔍 Monitoramento

O serviço expõe métricas de saúde que podem ser monitoradas:

```bash
# Status da aplicação
curl http://localhost:5001/health

# Status da conexão DB2
curl http://localhost:5001/health/detailed
```

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
db2-service/
├── src/
│   ├── index.ts          # Servidor principal
│   ├── services/
│   │   └── db2-service.ts # Lógica de conexão DB2
│   └── routes/
│       ├── health.ts      # Rotas de health check
│       └── query.ts       # Rotas de consulta
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

### Scripts Disponíveis

- `npm run dev` - Desenvolvimento com hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Executar versão compilada
- `npm test` - Executar testes (quando implementados)

## 🔒 Segurança

- Não expor credenciais DB2 em logs
- Usar HTTPS em produção
- Implementar rate limiting se necessário
- Validar todas as queries SQL de entrada

## 📝 Logs

O serviço produz logs estruturados para facilitar debugging:

```
🚀 DB2 Service rodando na porta 5001
🔄 Conectando ao DB2...
📡 Host: bi.proj.ufsm.br:50000
🗄️ Database: bee
✅ Conectado ao DB2 com sucesso!
```
