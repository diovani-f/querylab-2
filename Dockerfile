# Dockerfile para backend com suporte ao IBM DB2
FROM node:18-bullseye AS builder

# Instalar dependências do sistema necessárias para ibm_db
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY backend/package*.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY backend/ ./

# Compilar TypeScript
RUN npm run build

# Imagem final
FROM node:18-bullseye AS production

# Instalar dependências mínimas do sistema para runtime
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar dependências e código compilado
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Criar usuário não-root
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["npm", "start"]
