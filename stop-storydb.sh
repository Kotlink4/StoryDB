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

cd "$ROOT"

echo "Stopping StoryDB API and frontend..."
stop_port_process 5282
stop_port_process 50201

echo "Stopping Docker containers..."
docker compose down

echo "StoryDB is stopped. PostgreSQL data volume was kept."
