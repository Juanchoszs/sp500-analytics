#!/bin/bash

# Start script mejorado: mata procesos existentes que ocupen los puertos esperados
# y arranca backend (uvicorn) y frontend (vite) en modo desarrollo.

set -u

echo "========================================="
echo "   Iniciando SPY Market Intelligence"
echo "========================================="

# Puertos que el script controla
PORTS=(8000 5173 5174 5175 5176)

# Función para limpiar al salir (Ctrl+C)
cleanup() {
  echo ""
  echo "Deteniendo servidores..."
  # Intentar terminar los procesos arrancados por este script
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    sleep 0.5
    kill -0 "${BACKEND_PID}" 2>/dev/null && kill -9 "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
    sleep 0.5
    kill -0 "${FRONTEND_PID}" 2>/dev/null && kill -9 "${FRONTEND_PID}" 2>/dev/null || true
  fi

  # Asegurar que no queden procesos escuchando en los puertos controlados
  if command -v lsof >/dev/null 2>&1; then
    for p in "${PORTS[@]}"; do
      PIDS=$(lsof -tiTCP:$p -sTCP:LISTEN -n -P || true)
      if [ -n "$PIDS" ]; then
        echo "Matando procesos residuales en puerto $p: $PIDS"
        kill -9 $PIDS 2>/dev/null || true
      fi
    done
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

# 0. Matamos procesos que pudieran estar ocupando los puertos para evitar conflictos
if command -v lsof >/dev/null 2>&1; then
  echo "Comprobando puertos y matando procesos que los ocupen..."
  for p in "${PORTS[@]}"; do
    # Recolectar PIDs de forma robusta (uno por uno)
    MAP_PIDS=()
    while IFS= read -r pid; do
      [ -z "$pid" ] && continue
      MAP_PIDS+=("$pid")
    done < <(lsof -tiTCP:$p -sTCP:LISTEN -n -P 2>/dev/null || true)

    if [ ${#MAP_PIDS[@]} -gt 0 ]; then
      echo "Puerto $p ocupado por PIDs: ${MAP_PIDS[*]}"
      # Intentar terminar suavemente cada PID
      for pid in "${MAP_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
      done

      # Esperar a que el puerto se libere (timeout)
      TIMEOUT=10
      COUNT=0
      while [ $COUNT -lt $TIMEOUT ]; do
        if [ -z "$(lsof -tiTCP:$p -sTCP:LISTEN -n -P 2>/dev/null || true)" ]; then
          break
        fi
        echo "Esperando que puerto $p se libere..."
        sleep 0.5
        COUNT=$((COUNT+1))
      done

      # Si aún queda alguno, forzar
      STILL=$(lsof -tiTCP:$p -sTCP:LISTEN -n -P 2>/dev/null || true)
      if [ -n "$STILL" ]; then
        echo "Forzando kill -9 a: $STILL"
        kill -9 $STILL 2>/dev/null || true
      fi
    else
      echo "Puerto $p libre"
    fi
  done
else
  echo "Aviso: lsof no está disponible. Skipping port cleanup." >&2
fi

# 1. Crear carpeta de logs y arrancar Backend
mkdir -p ./logs

echo "[1/2] Iniciando Backend (FastAPI) en el puerto 8000..."
cd backend || exit 1
# Activar entorno virtual si existe
if [ -f "venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate 2>/dev/null || true
fi
# Arrancar uvicorn en background (logs en ./logs/backend.log)
venv/bin/uvicorn app.main:app --reload --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (logs: ./logs/backend.log)"
cd ..

# Esperar a que el backend responda /health (timeout)
HEALTH_URL="http://localhost:8000/health"
RETRIES=20
SLEEP=0.5
READY=false
for i in $(seq 1 $RETRIES); do
  if command -v curl >/dev/null 2>&1; then
    STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)
    if [ "$STATUS" = "200" ]; then
      READY=true
      break
    fi
  else
    # Si no hay curl, esperar un poco y seguir
    sleep $SLEEP
  fi
  sleep $SLEEP
done

if [ "$READY" = true ]; then
  echo "Backend listo en $HEALTH_URL"
else
  echo "Advertencia: Backend no respondió en $HEALTH_URL después de $RETRIES intentos. Revisa logs: ./logs/backend.log"
fi

# 2. Iniciar Frontend
echo "[2/2] Iniciando Frontend (React/Vite)..."
cd frontend || exit 1
# Lanzar Vite en background y redirigir logs
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID (logs: ./logs/frontend.log)"
cd ..

echo "========================================="
echo "✅ Sistema en ejecución."
echo "👉 Frontend (puerto por defecto): http://localhost:5173 (Vite puede elegir otro puerto si 5173 está ocupado)"
echo "👉 Backend:  http://localhost:8000"
echo "⚠️  Presiona Ctrl+C para detener ambos servidores."
echo "Logs: ./logs/backend.log  ./logs/frontend.log"
echo "========================================="

# Esperar a que los procesos terminen (o hasta Ctrl+C)
wait "$BACKEND_PID" "$FRONTEND_PID"

