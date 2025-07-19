@echo off
echo 🚀 Iniciando QueryLab...
echo.

echo 📊 Iniciando JSON Server...
start "JSON Server" cmd /k "cd mock-data && json-server --watch db.json --port 3001"

echo ⏳ Aguardando JSON Server inicializar...
timeout /t 3 /nobreak > nul

echo 🔧 Iniciando Backend...
start "Backend" cmd /k "cd backend && npm run dev"

echo ⏳ Aguardando Backend inicializar...
timeout /t 5 /nobreak > nul

echo 🌐 Iniciando Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Todos os serviços foram iniciados!
echo.
echo 📋 URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    JSON Server: http://localhost:3001
echo.
echo 🔐 Credenciais de teste:
echo    Admin: admin@querylab.com / admin123
echo    User:  joao@exemplo.com / 123456
echo.
pause
