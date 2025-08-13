#!/bin/bash

# Script para iniciar ambiente de desenvolvimento
echo "🚀 Iniciando ambiente de desenvolvimento QueryLab..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Função para verificar se uma porta está em uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️ Porta $1 já está em uso"
        return 1
    else
        return 0
    fi
}

# Verificar portas necessárias
echo "🔍 Verificando portas disponíveis..."
check_port 3000 || echo "Frontend pode ter conflito na porta 3000"
check_port 5000 || echo "Backend pode ter conflito na porta 5000"
check_port 5001 || echo "DB2 Service pode ter conflito na porta 5001"

# Opções de execução
echo ""
echo "Escolha uma opção:"
echo "1) Executar apenas DB2 Service (para desenvolvimento local)"
echo "2) Executar backend + DB2 Service"
echo "3) Executar stack completo (frontend + backend + DB2 Service)"
echo "4) Executar apenas backend (assumindo DB2 Service já rodando)"
echo ""
read -p "Digite sua escolha (1-4): " choice

case $choice in
    1)
        echo "🔧 Iniciando apenas DB2 Service..."
        cd db2-service
        if [ ! -f .env ]; then
            echo "⚠️ Arquivo .env não encontrado. Copiando .env.example..."
            cp .env.example .env
            echo "📝 Por favor, edite db2-service/.env com suas credenciais DB2"
            exit 1
        fi
        npm install
        npm run dev
        ;;
    2)
        echo "🔧 Iniciando backend + DB2 Service..."
        docker-compose up db2-service backend
        ;;
    3)
        echo "🔧 Iniciando stack completo..."
        docker-compose up
        ;;
    4)
        echo "🔧 Iniciando apenas backend..."
        cd backend
        npm install
        npm run dev
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac
