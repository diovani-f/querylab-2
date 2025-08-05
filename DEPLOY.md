# 🚀 Guia de Deploy - QueryLab

## ✅ Status dos Builds

- ✅ **Frontend**: Build funcionando corretamente
- ✅ **Backend**: Build funcionando corretamente
- ✅ **Docker**: Dockerfile criado
- ✅ **Railway**: Configuração criada

## 🎯 Opções de Deploy Recomendadas

### 1. 🚂 Railway (Recomendado)

**Por que Railway?**
- ✅ Suporte nativo a monorepos
- ✅ PostgreSQL gratuito incluído
- ✅ WebSocket funciona perfeitamente
- ✅ Deploy automático via Git
- ✅ Variáveis de ambiente fáceis

**Como fazer deploy:**

1. **Conecte o repositório**:
   - Acesse [railway.app](https://railway.app)
   - Conecte seu GitHub
   - Selecione este repositório

2. **Configure os serviços**:

   **Opção A - Serviços Separados (Recomendado):**
   - Crie um serviço para o backend (pasta raiz)
   - Crie outro serviço para o frontend (pasta frontend)

   **Opção B - Monorepo:**
   - Railway detectará automaticamente usando os arquivos railway.json

3. **Adicione PostgreSQL**:
   - No dashboard, clique em "Add Service"
   - Selecione "PostgreSQL"
   - Railway criará automaticamente a `DATABASE_URL`

4. **Configure variáveis de ambiente**:

   **Backend:**
   ```env
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://seu-frontend.railway.app
   DB_TYPE=postgresql
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=seu_jwt_secret_super_seguro
   CORS_ORIGIN=https://seu-frontend.railway.app
   ```

   **Frontend:**
   ```env
   NEXT_PUBLIC_API_URL=https://seu-backend.railway.app/api
   NEXT_PUBLIC_WEBSOCKET_URL=https://seu-backend.railway.app
   ```

5. **Deploy**:
   - Railway fará deploy automaticamente
   - Monitore os logs para verificar se tudo está funcionando

### 2. 🎨 Render

**Como fazer deploy:**

1. **Backend (Web Service)**:
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Environment: Node.js

2. **Frontend (Static Site)**:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/.next`

3. **PostgreSQL**:
   - Adicione um PostgreSQL service
   - Configure a `DATABASE_URL`

### 3. 🐳 Docker (Qualquer plataforma)

**Backend:**
```bash
# Build da imagem do backend
docker build -t querylab-backend .

# Run local
docker run -p 5000:5000 --env-file .env querylab-backend
```

**Frontend:**
```bash
# Build da imagem do frontend
cd frontend
docker build -t querylab-frontend .

# Run local
docker run -p 3000:3000 querylab-frontend
```

**Docker Compose (Recomendado):**
```bash
# Criar docker-compose.yml e rodar
docker-compose up --build
```

## 🗄️ Configuração do Banco de Dados

### PostgreSQL (Produção)

Você precisará migrar os dados do JSON Server para PostgreSQL. Crie as tabelas:

```sql
-- Universidades
CREATE TABLE universidades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(10),
  tipo VARCHAR(50),
  regiao VARCHAR(50),
  estado VARCHAR(50),
  cidade VARCHAR(100),
  fundacao INTEGER,
  campus INTEGER,
  alunos_total INTEGER,
  professores_total INTEGER,
  cursos_graduacao INTEGER,
  cursos_pos_graduacao INTEGER
);

-- Pessoas
CREATE TABLE pessoas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50),
  universidade_id INTEGER REFERENCES universidades(id),
  departamento VARCHAR(100),
  curso VARCHAR(100),
  titulacao VARCHAR(100),
  area_pesquisa VARCHAR(255),
  email VARCHAR(255)
);

-- Cursos
CREATE TABLE cursos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50),
  universidade_id INTEGER REFERENCES universidades(id),
  departamento VARCHAR(100),
  duracao INTEGER,
  vagas_anuais INTEGER,
  nota_corte DECIMAL(4,2),
  modalidade VARCHAR(50)
);

-- Regiões
CREATE TABLE regioes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  estados TEXT[],
  populacao BIGINT,
  universidades_federais INTEGER,
  universidades_estaduais INTEGER,
  universidades_privadas INTEGER
);
```

## 🔧 Troubleshooting

### Problemas Comuns:

1. **WebSocket não conecta**:
   - Verifique se as URLs estão corretas
   - Certifique-se que o backend suporta WebSocket

2. **CORS Error**:
   - Configure `CORS_ORIGIN` com a URL do frontend
   - Verifique `FRONTEND_URL` no backend

3. **Database Connection Error**:
   - Verifique a `DATABASE_URL`
   - Certifique-se que o PostgreSQL está rodando

4. **Build Fails**:
   - Verifique se todas as dependências estão instaladas
   - Execute `npm run build` localmente primeiro

## 📝 Checklist de Deploy

- [ ] Builds locais funcionando (frontend e backend)
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados PostgreSQL criado
- [ ] Dados migrados do JSON Server
- [ ] URLs de produção atualizadas
- [ ] CORS configurado corretamente
- [ ] WebSocket testado
- [ ] Deploy realizado com sucesso
- [ ] Aplicação testada em produção

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs da aplicação
2. Teste localmente primeiro
3. Confirme que todas as variáveis de ambiente estão corretas
4. Verifique a conectividade do banco de dados
