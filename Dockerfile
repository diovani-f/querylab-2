# Dockerfile simplificado para backend apenas
FROM node:18-alpine AS builder

# Instalar dependências do backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar código fonte e compilar
COPY backend/ ./
RUN npm run build

# Imagem final
FROM node:18-alpine AS production
WORKDIR /app

# Copiar dependências
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copiar código compilado
COPY --from=builder /app/dist ./dist

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["npm", "start"]
