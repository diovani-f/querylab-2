# Multi-stage build para otimizar o tamanho da imagem

# Stage 1: Build do backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
RUN npm run build

# Stage 2: Build do frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 3: Imagem final
FROM node:18-alpine AS production
WORKDIR /app

# Instalar dependências do backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copiar arquivos compilados
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=frontend-builder /app/frontend/.next ../frontend/.next
COPY --from=frontend-builder /app/frontend/public ../frontend/public
COPY --from=frontend-builder /app/frontend/package.json ../frontend/package.json

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expor portas
EXPOSE 5000

# Comando para iniciar o backend
CMD ["npm", "start"]
