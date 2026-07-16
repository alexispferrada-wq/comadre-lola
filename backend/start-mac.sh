#!/bin/bash
# start-mac.sh — La Comadre Lola
# Arranque local con limpieza de puertos + build opcional

set -euo pipefail

cd "$(dirname "$0")"

APP_MODE="${1:-start}"
PORTS_TO_CLEAN="${LOLA_PORTS:-3001 5500}"

if [ -z "${LOLA_PORTS:-}" ] && [ -f .env ]; then
  ENV_PORTS="$(grep -E '^LOLA_PORTS=' .env | head -n1 | cut -d= -f2- || true)"
  if [ -n "${ENV_PORTS}" ]; then
    PORTS_TO_CLEAN="${ENV_PORTS}"
  fi
fi

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"${port}" || true)"
  if [ -n "${pids}" ]; then
    echo "[..] Liberando puerto ${port} (PID: ${pids//$'\n'/, })"
    echo "${pids}" | xargs kill -9
    echo "[OK] Puerto ${port} liberado"
  else
    echo "[OK] Puerto ${port} ya estaba libre"
  fi
}

echo "[..] Limpiando puertos: ${PORTS_TO_CLEAN}"
for p in ${PORTS_TO_CLEAN}; do
  kill_port "${p}"
done

# Crear .env si no existe
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[OK] .env creado desde .env.example"
fi

# Instalar dependencias si falta
if [ ! -d node_modules ]; then
  echo "[..] Instalando dependencias..."
  npm install
fi

# Ejecutar build si el proyecto lo define
if node -e "const s=(require('./package.json').scripts||{}); process.exit(s.build?0:1)"; then
  echo "[..] Ejecutando build..."
  npm run build
else
  echo "[OK] No hay script build, se omite"
fi

echo ""
echo " La Comadre Lola — Local"
echo " ======================================"
echo " Sitio : http://localhost:3001"
echo " Admin : http://localhost:3001/admin"
echo " Editor: http://localhost:3001/editor"
echo " Login : http://localhost:3001/login"
echo " ======================================"
echo " Ctrl+C para detener"
echo ""

if [ "${APP_MODE}" = "dev" ]; then
  npm run dev
else
  node server.js
fi
