#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_LOG="$ROOT/api-dev-5282.log"
API_ERR_LOG="$ROOT/api-dev-5282.err.log"
CLIENT_LOG="$ROOT/client-dev-50201.log"
CLIENT_ERR_LOG="$ROOT/client-dev-50201.err.log"
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

cd "$ROOT"

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker-compose was not found. Install docker-compose v1 or Docker Compose plugin." >&2
  exit 1
fi

echo "Stopping old StoryDB app processes..."
stop_port_process 5282
stop_port_process 50201

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
nohup dotnet run --project StoryDB.Api --launch-profile http >"$API_LOG" 2>"$API_ERR_LOG" &

echo "Starting StoryDB frontend on http://127.0.0.1:50201 ..."
(
  cd "$ROOT/storydb.client"
  nohup npm run dev -- --host 127.0.0.1 >"$CLIENT_LOG" 2>"$CLIENT_ERR_LOG" &
)

echo
echo "StoryDB is starting."
echo "Frontend: http://127.0.0.1:50201"
echo "API:      http://localhost:5282"
echo "API log:  $API_LOG"
echo "UI log:   $CLIENT_LOG"
