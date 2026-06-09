#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_LOG="$ROOT/api-dev-5282.log"
API_ERR_LOG="$ROOT/api-dev-5282.err.log"
CLIENT_LOG="$ROOT/client-dev-50201.log"
CLIENT_ERR_LOG="$ROOT/client-dev-50201.err.log"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-}"
stop_port_process() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN || true)"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
  fi

  if [[ -n "$pids" ]]; then
    kill $pids 2>/dev/null || true
  fi
}

is_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port"
    return
  fi

  return 1
}

cd "$ROOT"

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker-compose was not found. Install docker-compose v1 or Docker Compose plugin." >&2
  exit 1
fi

echo "Stopping old StoryDB app processes..."
stop_port_process 5282
stop_port_process 50201

if [[ -z "$POSTGRES_HOST_PORT" ]]; then
  POSTGRES_HOST_PORT=5432
  while is_port_in_use "$POSTGRES_HOST_PORT"; do
    if [[ "$POSTGRES_HOST_PORT" -eq 5432 ]]; then
      POSTGRES_HOST_PORT=5433
    else
      POSTGRES_HOST_PORT=$((POSTGRES_HOST_PORT + 1))
    fi
  done
fi
export POSTGRES_HOST_PORT

echo "Using PostgreSQL host port $POSTGRES_HOST_PORT."
echo "Starting PostgreSQL container..."
docker-compose up -d

echo "Waiting for PostgreSQL healthcheck..."
deadline=$((SECONDS + 60))
health=""
while (( SECONDS < deadline )); do
  health="$(docker inspect --format='{{.State.Health.Status}}' storydb-postgres 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    break
  fi
  sleep 2
done

if [[ "$health" != "healthy" ]]; then
  echo "PostgreSQL container did not become healthy in 60 seconds." >&2
  exit 1
fi

echo "Starting StoryDB API on http://localhost:5282 ..."
ConnectionStrings__StoryDb="Host=localhost;Port=$POSTGRES_HOST_PORT;Database=storydb;Username=postgres;Password=postgres" \
ASPNETCORE_ENVIRONMENT=Development \
  nohup dotnet run --project StoryDB.Api --no-launch-profile --urls http://0.0.0.0:5282 >"$API_LOG" 2>"$API_ERR_LOG" &

echo "Starting StoryDB frontend on http://0.0.0.0:50201 ..."
(
  cd "$ROOT/storydb.client"
  nohup npm run dev -- --host 0.0.0.0 >"$CLIENT_LOG" 2>"$CLIENT_ERR_LOG" &
)

echo "Waiting for API and frontend ports..."
for port in 5282 50201; do
  deadline=$((SECONDS + 30))
  while (( SECONDS < deadline )); do
    if is_port_in_use "$port"; then
      break
    fi
    sleep 1
  done

  if ! is_port_in_use "$port"; then
    echo "Port $port is not listening yet." >&2
    if [[ "$port" == "5282" ]]; then
      echo "--- API stdout ---" >&2
      tail -n 40 "$API_LOG" 2>/dev/null >&2 || true
      echo "--- API stderr ---" >&2
      tail -n 40 "$API_ERR_LOG" 2>/dev/null >&2 || true
    else
      echo "--- Frontend stdout ---" >&2
      tail -n 40 "$CLIENT_LOG" 2>/dev/null >&2 || true
      echo "--- Frontend stderr ---" >&2
      tail -n 40 "$CLIENT_ERR_LOG" 2>/dev/null >&2 || true
    fi
  fi
done

echo
echo "StoryDB is starting."
echo "Frontend: http://SERVER_IP:50201"
echo "API:      http://localhost:5282"
echo "API log:  $API_LOG"
echo "UI log:   $CLIENT_LOG"
