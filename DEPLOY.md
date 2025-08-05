# 🚀 Guia de Deploy Railway - QueryLab

## ✅ Status dos Builds

- ✅ **Frontend**: Build funcionando corretamente
- ✅ **Backend**: Build funcionando corretamente
- ✅ **JSON Server**: Dados mock prontos
- ✅ **Railway**: Configuração criada

## 🚂 Deploy no Railway - Passo a Passo Completo

### 📋 **Pré-requisitos**
- [ ] Conta no GitHub com o repositório QueryLab
- [ ] Conta no Railway ([railway.app](https://railway.app))
- [ ] Builds locais funcionando

---

## 🎯 **PASSO 1: Preparação Inicial**

### 1.1 Acesse o Railway
1. Vá para [railway.app](https://railway.app)
2. Clique em **"Login"**
3. Conecte com sua conta GitHub
4. Autorize o Railway a acessar seus repositórios

### 1.2 Crie um Novo Projeto
1. No dashboard, clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Encontre e selecione o repositório **querylab**
4. Clique em **"Deploy Now"**

---

## 🎯 **PASSO 2: Configurar o Backend**

### 2.1 Configurar o Serviço Backend
1. Railway criará automaticamente um serviço
2. Clique no serviço criado
3. Vá para a aba **"Settings"**
4. Em **"Service Name"**, renomeie para `querylab-backend`

### 2.2 Configurar Build do Backend
1. Na aba **"Settings"**, encontre **"Build"**
2. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 2.3 Configurar Variáveis de Ambiente do Backend
1. Vá para a aba **"Variables"**
2. Adicione as seguintes variáveis:

```env
NODE_ENV=production
PORT=5000
DB_TYPE=json-server
JSON_SERVER_URL=https://querylab-json-server.railway.app
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_123456
CORS_ORIGIN=https://querylab-frontend.railway.app
FRONTEND_URL=https://querylab-frontend.railway.app
```

**⚠️ Importante**: Substitua as URLs pelos domínios reais que o Railway gerar

---

## 🎯 **PASSO 3: Configurar o JSON Server**

### 3.1 Criar Serviço para JSON Server
1. No dashboard do projeto, clique em **"+ New Service"**
2. Selecione **"GitHub Repo"**
3. Selecione o mesmo repositório **querylab**
4. Clique em **"Deploy"**

### 3.2 Configurar o JSON Server
1. Clique no novo serviço
2. Vá para **"Settings"**
3. Renomeie para `querylab-json-server`
4. Configure:
   - **Root Directory**: `mock-data`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:railway`

### 3.3 Variáveis do JSON Server
1. Vá para **"Variables"**
2. Adicione:
```env
PORT=3001
```

---

## 🎯 **PASSO 4: Configurar o Frontend**

### 4.1 Criar Serviço Frontend
1. No dashboard, clique em **"+ New Service"**
2. Selecione **"GitHub Repo"**
3. Selecione o repositório **querylab**
4. Clique em **"Deploy"**

### 4.2 Configurar Build do Frontend
1. Clique no serviço frontend
2. Vá para **"Settings"**
3. Renomeie para `querylab-frontend`
4. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 4.3 Variáveis do Frontend
1. Vá para **"Variables"**
2. Adicione (substitua pelas URLs reais):
```env
NEXT_PUBLIC_API_URL=https://querylab-backend.railway.app/api
NEXT_PUBLIC_WEBSOCKET_URL=https://querylab-backend.railway.app
```

---

## 🎯 **PASSO 5: Obter URLs e Atualizar Configurações**

### 5.1 Copiar URLs dos Serviços
1. Vá para cada serviço
2. Na aba **"Settings"**, encontre **"Domains"**
3. Copie a URL gerada (ex: `https://querylab-backend-production.up.railway.app`)

### 5.2 Atualizar Variáveis com URLs Reais
1. **Backend** - atualize:
   ```env
   CORS_ORIGIN=https://sua-url-frontend-real.railway.app
   FRONTEND_URL=https://sua-url-frontend-real.railway.app
   ```

2. **Frontend** - atualize:
   ```env
   NEXT_PUBLIC_API_URL=https://sua-url-backend-real.railway.app/api
   NEXT_PUBLIC_WEBSOCKET_URL=https://sua-url-backend-real.railway.app
   ```

3. **Backend** - atualize JSON Server URL:
   ```env
   JSON_SERVER_URL=https://sua-url-json-server-real.railway.app
   ```

---

## 🎯 **PASSO 6: Deploy e Verificação**

### 6.1 Fazer Deploy
1. Após configurar todas as variáveis, os serviços farão redeploy automaticamente
2. Monitore os logs de cada serviço:
   - Clique no serviço
   - Vá para a aba **"Deployments"**
   - Clique no deployment ativo
   - Monitore os logs

### 6.2 Ordem de Deploy
1. **Primeiro**: JSON Server (deve estar rodando)
2. **Segundo**: Backend (conecta ao JSON Server)
3. **Terceiro**: Frontend (conecta ao Backend)

### 6.3 Verificar se Está Funcionando
1. **JSON Server**: Acesse `https://sua-url-json-server.railway.app/universidades`
2. **Backend**: Acesse `https://sua-url-backend.railway.app/api/health`
3. **Frontend**: Acesse `https://sua-url-frontend.railway.app`

---

## 🎯 **PASSO 7: Configurações Finais**

### 7.1 Configurar Domínios Personalizados (Opcional)
1. Em cada serviço, vá para **"Settings" > "Domains"**
2. Clique em **"Custom Domain"**
3. Adicione seu domínio personalizado

### 7.2 Configurar Variáveis de Produção
1. Adicione variáveis adicionais conforme necessário:
```env
# Backend
OPENAI_API_KEY=sua_chave_openai (opcional)
ANTHROPIC_API_KEY=sua_chave_anthropic (opcional)
GROQ_API_KEY=sua_chave_groq (opcional)
```

---

## ✅ **Checklist de Verificação**

- [ ] JSON Server respondendo em `/universidades`, `/pessoas`, `/cursos`
- [ ] Backend respondendo em `/api/health`
- [ ] Frontend carregando corretamente
- [ ] WebSocket conectando (verificar no console do navegador)
- [ ] Chat funcionando (enviar mensagem de teste)
- [ ] Sessões sendo criadas e listadas
- [ ] Sem erros de CORS no console

---

## � **Correção de Serviços Já Criados**

Se você já criou os serviços e está tendo problemas, siga estas correções:

### Backend com erro "cd not found":
1. Vá para o serviço backend no Railway
2. **Settings** > **Service Settings**
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Clique em **"Redeploy"**

### JSON Server com erro "npm not found":
1. Vá para o serviço JSON Server
2. **Settings** > **Service Settings**
3. Configure:
   - **Root Directory**: `mock-data`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:railway`
4. Clique em **"Redeploy"**

### Frontend:
1. **Root Directory**: `frontend`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm start`

---

## �🚨 **Troubleshooting**

### Problema: JSON Server não inicia
**Solução**:
1. Verifique se o `db.json` e `package.json` estão na pasta `mock-data`
2. Confirme as configurações:
   - **Root Directory**: `mock-data`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:railway`
3. Verifique se a variável `PORT` está configurada
4. Se ainda houver erro, tente usar `json-server --watch db.json --port $PORT --host 0.0.0.0` diretamente

### Problema: Backend falha no deploy ("cd not found")
**Solução**:
1. Configure **Root Directory** como `backend`
2. Use comandos simples:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Não use `cd` nos comandos

### Problema: Backend não conecta ao JSON Server
**Solução**:
1. Verifique se `JSON_SERVER_URL` está correto
2. Aguarde o JSON Server estar rodando antes do backend

### Problema: Frontend não conecta ao Backend
**Solução**:
1. Verifique `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WEBSOCKET_URL`
2. Confirme que não há erros de CORS

### Problema: WebSocket não conecta
**Solução**:
1. Verifique se `NEXT_PUBLIC_WEBSOCKET_URL` está correto
2. Railway suporta WebSocket automaticamente

---

## 🎉 **Parabéns!**

Sua aplicação QueryLab está agora rodando no Railway com:
- ✅ Frontend Next.js
- ✅ Backend Node.js/Express
- ✅ JSON Server com dados mock
- ✅ WebSocket funcionando
- ✅ Deploy automático via Git

**URLs finais:**
- Frontend: `https://sua-url-frontend.railway.app`
- Backend API: `https://sua-url-backend.railway.app/api`
- JSON Server: `https://sua-url-json-server.railway.app`

---

## 📚 **Informações Adicionais**

### Migração Futura para PostgreSQL
Quando quiser migrar do JSON Server para PostgreSQL:

1. **Adicione PostgreSQL no Railway**:
   - Clique em **"+ New Service"**
   - Selecione **"PostgreSQL"**
   - Railway criará automaticamente

2. **Atualize variáveis do Backend**:
   ```env
   DB_TYPE=postgresql
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

3. **Migre os dados**:
   - Exporte dados do `mock-data/db.json`
   - Importe para PostgreSQL

### Comandos Úteis

**Verificar logs:**
```bash
# No Railway, vá para Deployments > View Logs
```

**Redeploy manual:**
```bash
# No Railway, vá para Deployments > Redeploy
```

**Testar localmente:**
```bash
# JSON Server
cd mock-data && json-server --watch db.json --port 3001

# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```
