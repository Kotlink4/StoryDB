#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo "Stopping StoryDB Docker stack..."
compose down

echo "StoryDB is stopped. PostgreSQL and uploads volumes were kept."
