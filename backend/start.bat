@echo off
:: ══════════════════════════════════════════════════════════
:: start.bat — La Comadre Lola
:: Arranca el servidor de desarrollo
:: ══════════════════════════════════════════════════════════

setlocal
set BACKEND_DIR=%~dp0

:: Verificar junction
if not exist "%BACKEND_DIR%node_modules" (
    echo  [!] node_modules no encontrado.
    echo      Ejecuta setup-dev.bat primero.
    pause & exit /b 1
)

echo.
echo  La Comadre Lola — Servidor de desarrollo
echo  =========================================
echo  API:  http://localhost:3001
echo  Ctrl+C para detener
echo  =========================================
echo.

cd /d "%BACKEND_DIR%"
node server.js
