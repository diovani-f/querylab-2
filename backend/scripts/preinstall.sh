#!/bin/bash

# Script para preparar ambiente para IBM DB2
echo "🔧 Preparando ambiente para IBM DB2..."

# Verificar se estamos em um ambiente Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📦 Instalando dependências do sistema..."
    
    # Tentar instalar dependências com diferentes gerenciadores de pacote
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y python3 make g++ build-essential
    elif command -v yum &> /dev/null; then
        yum install -y python3 make gcc-c++
    elif command -v apk &> /dev/null; then
        apk add --no-cache python3 make g++
    fi
    
    echo "✅ Dependências do sistema instaladas"
else
    echo "ℹ️ Sistema não é Linux, pulando instalação de dependências do sistema"
fi

echo "🚀 Ambiente preparado para instalação do IBM DB2"
