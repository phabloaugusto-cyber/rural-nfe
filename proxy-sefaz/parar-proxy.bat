@echo off
echo Parando proxy SEFAZ...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *server.js*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo Proxy parado.
pause
