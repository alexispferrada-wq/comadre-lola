@echo off
:: ══════════════════════════════════════════════════════════
:: setup-dev.bat — La Comadre Lola
:: Crea un junction point para node_modules fuera de Google Drive
:: Ejecutar UNA SOLA VEZ antes de empezar a desarrollar
:: ══════════════════════════════════════════════════════════

setlocal

set BACKEND_DIR=%~dp0
set LOCAL_MODS=C:\dev\lola-node_modules

echo.
echo  La Comadre Lola — Setup de desarrollo
echo  =========================================

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js no encontrado. Instala desde nodejs.org
    pause & exit /b 1
)
echo  [OK] Node.js encontrado

:: Crear directorio local si no existe
if not exist "%LOCAL_MODS%" (
    mkdir "%LOCAL_MODS%"
    echo  [OK] Carpeta creada: %LOCAL_MODS%
) else (
    echo  [OK] Carpeta ya existe: %LOCAL_MODS%
)

:: Eliminar node_modules de Drive si existe (pueden estar corruptos)
if exist "%BACKEND_DIR%node_modules" (
    echo  [..] Eliminando node_modules de Drive...
    rmdir /s /q "%BACKEND_DIR%node_modules"
    echo  [OK] node_modules de Drive eliminado
)

:: Crear junction point
echo  [..] Creando junction point...
mklink /J "%BACKEND_DIR%node_modules" "%LOCAL_MODS%"
if errorlevel 1 (
    echo  [ERROR] No se pudo crear el junction. Intenta ejecutar como Administrador.
    pause & exit /b 1
)
echo  [OK] Junction creado: backend\node_modules ^-^> %LOCAL_MODS%

:: Instalar dependencias
echo  [..] Instalando dependencias npm...
cd /d "%BACKEND_DIR%"
npm install
if errorlevel 1 (
    echo  [ERROR] npm install fallo
    pause & exit /b 1
)

echo.
echo  =========================================
echo  Setup completo.
echo  Ahora usa start.bat para arrancar el servidor.
echo  =========================================
echo.
pause
