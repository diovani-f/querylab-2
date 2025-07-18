@echo off
echo Iniciando JSON Server para QueryLab...
json-server --watch db.json --port 3001 --host localhost
pause
