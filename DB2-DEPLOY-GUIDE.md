# 🚀 Guia de Deploy DB2 Service - Railway + VPN Universidade

## 🎯 **Arquitetura da Solução**

```
┌─────────────────┐    HTTP/HTTPS    ┌──────────────────┐    VPN    ┌─────────────────┐
│   Railway       │ ────────────────→ │  Sua Máquina     │ ────────→ │ DB2 Universidade│
│   DB2 Service   │                   │  Proxy Local     │           │                 │
└─────────────────┘                   └──────────────────┘           └─────────────────┘
```

## 📋 **Pré-requisitos**

- ✅ Acesso VPN à universidade
- ✅ Credenciais do DB2
- ✅ Conta Railway
- ✅ Node.js instalado localmente

## 🚀 **Passo a Passo**

### **ETAPA 1: Configurar Proxy Local**

#### 1.1 Instalar Proxy Local
```bash
cd db2-proxy-local
npm install
```

#### 1.2 Configurar Variáveis
```bash
cp .env.example .env
```

Edite `.env`:
```env
DB2_HOST=ip_do_db2_universidade
DB2_PORT=50000
DB2_DATABASE=UNIVDB
DB2_USERNAME=seu_usuario
DB2_PASSWORD=sua_senha
PROXY_PORT=3002
PROXY_SECRET=chave_super_secreta_123456
```

#### 1.3 Conectar VPN e Testar
```bash
# 1. Conectar à VPN da universidade
# 2. Iniciar proxy
npm run dev

# 3. Testar em outro terminal
curl http://localhost:3002/health
```

### **ETAPA 2: Expor Proxy (Escolha uma opção)**

#### **Opção A: VS Code Tunnel (Recomendado)**
1. No VS Code, pressione `Ctrl+Shift+P`
2. Digite: `Ports: Focus on Ports View`
3. Na aba **PORTS**, clique no **+**
4. Digite: `3002`
5. Clique com botão direito → **Port Visibility** → **Public**
6. **Copie a URL gerada** (ex: `https://3002-user-workspace.githubpreview.dev`)

#### **Opção B: Ngrok**
```bash
npm install -g ngrok
ngrok http 3002
```
**Copie a URL gerada** (ex: `https://abc123.ngrok.io`)

### **ETAPA 3: Deploy no Railway**

#### 3.1 Criar Serviço DB2
1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha seu repositório `querylab`

#### 3.2 Configurar Serviço
1. Clique no serviço criado
2. Vá para **"Settings"**
3. Renomeie para `querylab-db2-service`
4. Configure:
   - **Root Directory**: `db2-service`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### 3.3 Configurar Variáveis no Railway
Vá para **"Variables"** e adicione:

```env
NODE_ENV=production
DB2_SERVICE_PORT=5001

# Configuração do Proxy (OBRIGATÓRIO)
DB2_PROXY_URL=https://3002-user-workspace.githubpreview.dev
DB2_PROXY_SECRET=chave_super_secreta_123456
DB2_PROXY_TIMEOUT=30000

# CORS
CORS_ORIGIN=https://seu-frontend.railway.app
```

**⚠️ IMPORTANTE**:
- `DB2_PROXY_URL` deve ser a URL do VS Code tunnel
- `DB2_PROXY_SECRET` deve ser igual ao `PROXY_SECRET` do proxy local

### **ETAPA 4: Integrar com Backend Principal**

#### 4.1 Atualizar Backend
No seu backend principal, adicione variável:

```env
DB2_SERVICE_URL=https://querylab-db2-service.railway.app
```

#### 4.2 Modificar Rotas do Backend
```typescript
// No backend principal
app.post('/api/query/db2', async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.DB2_SERVICE_URL}/query`,
      req.body
    )
    res.json(response.data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

## ✅ **Verificação**

### 1. Testar Proxy Local
```bash
curl -X POST http://localhost:3002/query \
  -H "Authorization: Bearer sua_chave_secreta" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1 FROM SYSIBM.SYSDUMMY1"}'
```

### 2. Testar Railway
```bash
curl https://querylab-db2-service.railway.app/health
```

### 3. Testar Query Completa
```bash
curl -X POST https://querylab-db2-service.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) FROM UNIVERSIDADES"}'
```

## 🔧 **Configurações Avançadas**

### VS Code Tunnel Persistente
- A URL do VS Code tunnel é automaticamente persistente
- Formato: `https://3002-username-workspace.githubpreview.dev`
- Não muda entre sessões do VS Code

### Ngrok Persistente (se usar ngrok)
```bash
# Criar conta ngrok para URLs persistentes
ngrok authtoken seu_token
ngrok http 3002 --subdomain=querylab-db2
```

### Monitoramento
```bash
# Logs do proxy
tail -f logs/proxy.log

# Logs do Railway
# Acesse Railway > Deployments > View Logs
```

## 🚨 **Troubleshooting**

### Problema: Proxy não conecta ao DB2
**Solução:**
1. Verificar VPN conectada
2. Testar ping para o servidor DB2
3. Verificar credenciais

### Problema: Railway não acessa proxy
**Solução:**
1. Verificar ngrok rodando
2. Confirmar URL no Railway
3. Testar curl local primeiro

### Problema: Timeout de queries
**Solução:**
1. Aumentar `DB2_PROXY_TIMEOUT`
2. Otimizar queries SQL
3. Verificar latência da VPN

## 💡 **Dicas de Produção**

### 1. Automatização
Crie scripts para automatizar:
```bash
#!/bin/bash
# start-db2-proxy.sh
echo "Conectando VPN..."
# comando para conectar VPN

echo "Iniciando proxy..."
cd db2-proxy-local && npm start &

echo "Iniciando ngrok..."
ngrok http 3002
```

### 2. Monitoramento
- Configure alertas se proxy ficar offline
- Monitore logs de erro
- Configure health checks

### 3. Backup
- Mantenha múltiplas URLs ngrok
- Configure failover automático
- Documente todas as configurações

## 🎉 **Resultado Final**

Após seguir este guia, você terá:

- ✅ **Proxy local** conectando à VPN da universidade
- ✅ **Microserviço DB2** rodando no Railway
- ✅ **Conexão segura** via HTTPS/ngrok
- ✅ **Integração** com o backend principal
- ✅ **Monitoramento** e logs

**URLs finais:**
- Proxy local: `http://localhost:3002`
- Ngrok: `https://abc123.ngrok.io`
- Railway: `https://querylab-db2-service.railway.app`
