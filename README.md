# QueryLab 🧪

Uma plataforma moderna para consultas em linguagem natural usando LLMs (Large Language Models) para conversão text-to-SQL em bancos de dados relacionais.

## 🎯 Visão Geral

QueryLab é uma plataforma que permite aos usuários fazer consultas em linguagem natural e convertê-las automaticamente para SQL, facilitando a análise de dados para especialistas e usuários não-técnicos.

### ✨ Características Principais

- 🗣️ **Consultas em Linguagem Natural**: Digite perguntas em português e obtenha SQL automaticamente
- 🤖 **Múltiplos Modelos LLM**: Suporte para GPT-4, GPT-3.5, Claude 3 e outros
- 💬 **Interface de Chat**: Conversas em tempo real com histórico de sessões
- 🎨 **Temas Modernos**: Modo claro, escuro e alto contraste
- 📊 **Visualização de Resultados**: Tabelas formatadas e exportação de dados
- 🔄 **WebSocket**: Comunicação em tempo real
- 🗄️ **Múltiplos Bancos**: JSON Server (desenvolvimento) e DB2 (produção)

## 🏗️ Arquitetura

### Arquitetura de Microserviços

O QueryLab utiliza uma arquitetura de microserviços para resolver problemas de dependências nativas:

- **Frontend**: Next.js 14 com interface moderna
- **Backend Principal**: API REST + WebSocket (sem dependências nativas)
- **DB2 Service**: Microserviço dedicado para consultas IBM DB2

### Frontend (Next.js 14)
- **Framework**: Next.js 14 com App Router
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS + Shadcn/ui
- **Estado**: Zustand
- **WebSocket**: Socket.io-client

### Backend Principal (Node.js)
- **Runtime**: Node.js com Express
- **Linguagem**: TypeScript
- **WebSocket**: Socket.io
- **LLM**: Groq SDK (Llama 3, Mixtral)
- **Banco**: JSON Server (auth/sessões) + HTTP Client para DB2 Service

### DB2 Service (Microserviço)
- **Runtime**: Node.js com Express
- **Linguagem**: TypeScript
- **Banco**: IBM DB2 (driver nativo)
- **API**: REST endpoints para consultas SQL
- **Deploy**: Ambiente separado com suporte a dependências nativas

### Dados
- **Desenvolvimento**: JSON Server (porta 3001)
- **Produção**: DB2 (via VPN universitária)
- **Schema**: Dados universitários (universidades, pessoas, cursos, regiões)

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Git

### 1. Clone o Repositório
```bash
git clone <repository-url>
cd llm-text-to-sql
```

### 2. Instale as Dependências

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd backend
npm install
```

### 3. Configure as Variáveis de Ambiente

#### Backend (.env)
```env
# Servidor
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Banco de Dados
DB_TYPE=postgres
POSTGRES_URL=http://localhost:3001

# DB2 (Produção)
DB2_HOST=localhost
DB2_PORT=50000
DB2_DATABASE=UNIVDB
DB2_USERNAME=
DB2_PASSWORD=

# LLM APIs (Futuro)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:5000
```

### 4. Execute os Serviços

#### Terminal 1 - JSON Server (Dados Mock)
```bash
cd mock-data
json-server --watch db.json --port 3001
```

#### Terminal 2 - Backend
```bash
cd backend
npm run dev
```

#### Terminal 3 - Frontend
```bash
cd frontend
npm run dev
```

### 5. Acesse a Aplicação
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **JSON Server**: http://localhost:3001

## 📖 Como Usar

1. **Acesse** http://localhost:3000
2. **Crie uma nova sessão** clicando no botão "+"
3. **Digite sua consulta** em linguagem natural, por exemplo:
   - "Mostre todas as universidades federais"
   - "Quantos professores tem na USP?"
   - "Liste os cursos de ciência da computação"
4. **Visualize** o SQL gerado e os resultados
5. **Explore** o histórico de sessões na sidebar

## 🎨 Temas

A aplicação suporta 3 temas:
- **Claro**: Design limpo e moderno
- **Escuro**: Cores suaves para uso noturno
- **Alto Contraste**: Máximo contraste para acessibilidade

Altere o tema usando o seletor no header.

## 🗄️ Schema do Banco de Dados

### Universidades
- id, nome, sigla, tipo, região, estado, cidade
- fundação, campus, alunos_total, professores_total
- cursos_graduacao, cursos_pos_graduacao

### Pessoas
- id, nome, tipo (professor/aluno/funcionário)
- universidade_id, departamento, curso
- titulação, área_pesquisa, email

### Cursos
- id, nome, tipo, universidade_id
- departamento, duração, vagas_anuais
- nota_corte, modalidade

### Regiões
- id, nome, estados, população
- universidades_federais, estaduais, privadas

## 🔧 Desenvolvimento

### Estrutura de Pastas
```
querylab/
├── frontend/           # Next.js app
│   ├── src/
│   │   ├── app/       # App router
│   │   ├── components/ # Componentes
│   │   ├── lib/       # Utilities
│   │   ├── stores/    # Zustand stores
│   │   └── types/     # TypeScript types
├── backend/           # Backend principal (sem IBM DB2)
│   ├── src/
│   │   ├── routes/    # Express routes
│   │   ├── services/  # Business logic
│   │   ├── adapters/  # Database adapters
│   │   └── websockets/ # Socket.io handlers
├── db2-service/       # Microserviço para IBM DB2
│   ├── src/
│   │   ├── services/  # DB2 connection logic
│   │   └── routes/    # REST API endpoints
├── mock-data/         # JSON Server data
├── scripts/           # Scripts de desenvolvimento
└── docs/             # Documentação
```

### Scripts Disponíveis

#### Frontend
- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Servidor de produção

#### Backend Principal
- `npm run dev` - Servidor de desenvolvimento (nodemon)
- `npm run build` - Compilar TypeScript
- `npm run start` - Servidor de produção

#### DB2 Service
- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Compilar TypeScript
- `npm run start` - Servidor de produção

#### Scripts de Desenvolvimento
- `./scripts/start-dev.sh` - Menu interativo para desenvolvimento
- `docker-compose up db2-service` - Apenas DB2 Service
- `docker-compose up` - Stack completo

### APIs Disponíveis

#### Health Check
- `GET /api/health` - Status do servidor
- `GET /api/health/database` - Status do banco

#### Chat
- `POST /api/chat/message` - Enviar mensagem
- `GET /api/chat/sessions/:id` - Obter sessão

#### Sessões
- `GET /api/sessions` - Listar sessões
- `POST /api/sessions` - Criar sessão
- `PUT /api/sessions/:id` - Atualizar sessão
- `DELETE /api/sessions/:id` - Deletar sessão

## 🔮 Roadmap

### Próximas Funcionalidades
- [ ] Integração com LLMs reais (OpenAI, Anthropic)
- [ ] Conexão com DB2 via VPN
- [ ] Sistema de autenticação
- [ ] Exportação de resultados (CSV, Excel)
- [ ] Gráficos e visualizações
- [ ] Cache de consultas
- [ ] Logs e analytics
- [ ] Testes automatizados

### Melhorias Planejadas
- [ ] Otimização de performance
- [ ] PWA (Progressive Web App)
- [ ] Modo offline
- [ ] Suporte a múltiplos idiomas
- [ ] API rate limiting
- [ ] Documentação interativa

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Autores

- **Desenvolvedor Principal** - Implementação inicial

## 🙏 Agradecimentos

- Universidade pela disponibilização dos dados
- Comunidade open source pelas ferramentas utilizadas
- Contribuidores e testadores

---

**QueryLab** - Transformando linguagem natural em insights de dados 🚀
