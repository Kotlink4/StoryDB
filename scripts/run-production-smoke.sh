#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
CLIENT_URL="${CLIENT_URL:-http://127.0.0.1:50201}"
API_CONTAINER="${API_CONTAINER:-storydb-api}"
CLIENT_CONTAINER="${CLIENT_CONTAINER:-storydb-client}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file was not found: $COMPOSE_FILE" >&2
  exit 1
fi

echo "== Docker containers =="
docker compose -f "$COMPOSE_FILE" ps

echo "== Client-facing diagnostics =="
curl -fsS "$CLIENT_URL/live"
printf '\n'
curl -fsS "$CLIENT_URL/ready"
printf '\n'
curl -fsS "$CLIENT_URL/health"
printf '\n'

echo "== Prometheus metric markers =="
metrics="$(curl -fsS "$CLIENT_URL/metrics/prometheus")"
for marker in \
  storydb_api_requests_total \
  storydb_cache_singleflight_hits_total \
  storydb_audit_log_queue_dropped_total \
  storydb_export_job_queue_depth \
  storydb_process_gc_allocated_bytes_total \
  storydb_threadpool_worker_threads_used
do
  if ! grep -q "$marker" <<<"$metrics"; then
    echo "Missing Prometheus marker: $marker" >&2
    exit 1
  fi
  echo "ok $marker"
done

echo "== SPA entry =="
curl -fsSI "$CLIENT_URL/style-preview/profile"

echo "== API direct diagnostics from container =="
docker exec "$API_CONTAINER" curl -fsS http://127.0.0.1:5282/live >/dev/null
docker exec "$API_CONTAINER" curl -fsS http://127.0.0.1:5282/ready >/dev/null
docker exec "$API_CONTAINER" curl -fsS http://127.0.0.1:5282/health >/dev/null
docker exec "$API_CONTAINER" curl -fsS http://127.0.0.1:5282/metrics/prometheus >/dev/null
echo "ok api direct diagnostics"

echo "== Recent API logs =="
docker logs "$API_CONTAINER" --tail=120

echo "== Recent client logs =="
docker logs "$CLIENT_CONTAINER" --tail=80

echo "Production smoke passed."
