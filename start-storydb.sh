#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  echo "Docker Compose was not found. Install the docker compose plugin." >&2
  exit 1
}

cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker was not found. Install Docker Engine." >&2
  exit 1
fi

echo "Stopping old StoryDB Docker stack..."
compose down

echo "Stopping old host StoryDB processes..."
stop_port_process 5282
stop_port_process 50201

echo "Starting StoryDB Docker stack..."
compose up -d --build

echo
echo "StoryDB is running in Docker."
echo "Frontend: http://SERVER_IP:50201"
echo "API:      http://SERVER_IP:5282"
echo "Postgres: localhost:${POSTGRES_HOST_PORT:-5432}"
echo
echo "Logs:     docker compose logs -f"
