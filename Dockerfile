# Dockerfile para backend principal (sem IBM DB2)
FROM node:18-alpine AS builder

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY backend/package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY backend/ ./

# Compilar TypeScript
RUN npm run build

# Imagem final
FROM node:18-alpine AS production

WORKDIR /app

# Copiar dependências e código compilado
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["npm", "start"]
