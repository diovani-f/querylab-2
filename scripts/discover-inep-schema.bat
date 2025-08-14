@echo off
echo ========================================
echo    DESCOBERTA DO SCHEMA INEP - DB2
echo ========================================

echo [1/3] Instalando dependencias...
cd /d "%~dp0"
if not exist "node_modules" npm install

echo [2/3] Iniciando proxy DB2...
cd /d "%~dp0\..\db2-proxy-local"
start "DB2 Proxy" cmd /k "npm start"
timeout /t 5 /nobreak > nul

echo [3/3] Descobrindo schema...
cd /d "%~dp0"
node discover-schema.js

echo.
echo ========================================
echo    CONCLUIDO!
echo ========================================
echo Arquivos salvos em: backend/data/schema-discovery/
pause
