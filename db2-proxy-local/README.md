# 🔗 DB2 Proxy Local - QueryLab

Proxy local para conectar o microserviço DB2 no Railway ao banco DB2 da universidade via VPN.

## 🎯 **Como Funciona**

```
[Railway DB2 Service] → [Internet] → [Sua Máquina + VPN] → [DB2 Universidade]
```

1. **Sua máquina**: Conectada à VPN da universidade + roda este proxy
2. **Railway**: Microserviço que faz requests HTTP para este proxy
3. **Proxy**: Recebe requests e executa no DB2 via VPN

## 🚀 **Configuração**

### 1. Instalar Dependências
```bash
cd db2-proxy-local
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:
```env
# DB2 da Universidade
DB2_HOST=ip_do_servidor_db2_universidade
DB2_PORT=50000
DB2_DATABASE=UNIVDB
DB2_USERNAME=seu_usuario
DB2_PASSWORD=sua_senha

# Proxy
PROXY_PORT=3002
PROXY_SECRET=sua_chave_secreta_super_forte_123456

# Segurança
ALLOWED_ORIGINS=https://seu-microservico.railway.app
```

### 3. Conectar à VPN da Universidade
- Conecte-se à VPN da universidade
- Teste se consegue acessar o DB2

### 4. Iniciar o Proxy
```bash
npm run dev
```

### 5. Expor o Proxy (Escolha uma opção)

#### **Opção A: VS Code Tunnel (Mais Fácil)**
1. No VS Code, pressione `Ctrl+Shift+P`
2. Digite: `Ports: Focus on Ports View`
3. Na aba **PORTS**, clique no **+**
4. Digite: `3002`
5. Clique com botão direito → **Port Visibility** → **Public**
6. Copie a URL (ex: `https://3002-user-workspace.githubpreview.dev`)

#### **Opção B: Ngrok**
```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta 3002
ngrok http 3002
```
Copie a URL gerada (ex: `https://abc123.ngrok.io`)

#### **Opção C: Cloudflare Tunnel**
```bash
# Instalar cloudflared
cloudflared tunnel --url http://localhost:3002
```

## 🔧 **Configurar Railway**

No seu microserviço DB2 no Railway, adicione estas variáveis:

```env
USE_DB2_PROXY=true
DB2_PROXY_URL=https://3002-user-workspace.githubpreview.dev
DB2_PROXY_SECRET=sua_chave_secreta_super_forte_123456
DB2_PROXY_TIMEOUT=30000
```

## ✅ **Testar**

### 1. Testar Proxy Local
```bash
curl http://localhost:3002/health
```

### 2. Testar Query
```bash
curl -X POST http://localhost:3002/query \
  -H "Authorization: Bearer sua_chave_secreta" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1 FROM SYSIBM.SYSDUMMY1"}'
```

### 3. Testar do Railway
O microserviço no Railway deve conseguir executar queries via proxy.

## 🔒 **Segurança**

- ✅ Autenticação via Bearer token
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Helmet para headers de segurança
- ✅ Timeout de conexão e query

## 🚨 **Troubleshooting**

### Proxy não conecta ao DB2
1. Verifique se está conectado à VPN
2. Teste conexão direta ao DB2
3. Verifique credenciais no `.env`

### Railway não consegue acessar proxy
1. Verifique se ngrok está rodando
2. Confirme URL no Railway
3. Verifique token de autenticação

### Timeout de conexão
1. Aumente `DB2_PROXY_TIMEOUT`
2. Verifique latência da VPN
3. Teste conexão local primeiro

## 📝 **Scripts Disponíveis**

- `npm run dev`: Inicia em modo desenvolvimento
- `npm start`: Inicia em modo produção

## 🔄 **Fluxo Completo**

1. **Conectar VPN** da universidade
2. **Iniciar proxy** local (`npm run dev`)
3. **Expor proxy** com ngrok (`ngrok http 3002`)
4. **Configurar Railway** com URL do ngrok
5. **Testar** queries do Railway

## 💡 **Dicas**

- Mantenha a VPN sempre conectada
- Use ngrok auth para URLs persistentes
- Configure logs para debug
- Monitore rate limits
