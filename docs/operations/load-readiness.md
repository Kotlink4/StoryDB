# StoryDB Load Readiness

Этот чеклист закрывает этап подготовки StoryDB к более высокой нагрузке без изменения текущих правил rate limiting.

## Что уже должно быть включено

- API health endpoints: `/live`, `/ready`, `/health`.
- Prometheus diagnostics: `/metrics/prometheus`.
- Single-flight cache для тяжелых read-запросов.
- Фоновые очереди для audit log и DOCX export.
- Ограничения размера request body, upload и декодируемых изображений.
- Docker healthcheck для `api` и `client`.
- Согласованные дефолты пулов: `Database__DbContextPoolSize=128` и `POSTGRES_MAX_POOL_SIZE=128`.

Если на сервере меняется `DB_CONTEXT_POOL_SIZE`, одновременно меняйте `POSTGRES_MAX_POOL_SIZE` на то же значение или выше.

## Важные решения этапа

Rate limiting не расширяется в этой цели. В коде уже есть существующие политики для auth/upload/expensive endpoints, но этот этап не добавляет новые лимиты и не меняет их значения.

Очереди export/audit сейчас in-memory. Это достаточно для разгрузки HTTP-запросов и наблюдения за перегрузкой через метрики, но:

- export jobs, ожидающие или сохраненные только в памяти, не переживают рестарт API;
- audit queue может отбросить запись при заполнении, это видно в `storydb_audit_log_queue_dropped_total`.

Если понадобится строгая надежность после рестарта, следующий этап: персистентная таблица фоновых задач и/или audit outbox в БД.

Крупные чанки фронта не блокируют эту цель. Их нужно вести отдельной задачей клиентской оптимизации: code splitting графов, редакторов и ELK layout engine.

## Локальный Docker smoke

Запустить контейнеры:

```powershell
docker compose up -d --build
```

Проверить контейнеры и health:

```powershell
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
curl.exe -fsS http://localhost:5282/live
curl.exe -fsS http://localhost:5282/ready
curl.exe -fsS http://localhost:5282/health
curl.exe -fsS http://localhost:5282/metrics/prometheus
curl.exe -I http://localhost:50201/style-preview/profile
```

После пересборки nginx-клиент также проксирует диагностику наружу:

```powershell
curl.exe -fsS http://localhost:50201/live
curl.exe -fsS http://localhost:50201/ready
curl.exe -fsS http://localhost:50201/health
curl.exe -fsS http://localhost:50201/metrics/prometheus
```

Прогнать Node smoke с временным пользователем, проектом и тестовыми данными:

```powershell
.\scripts\run-local-load-smoke.ps1 -BaseUrl "http://localhost:50201"
```

`http://localhost:50201` проверяет пользовательский вход через nginx. `http://localhost:5282` проверяет API напрямую.

Порог прохождения:

- failure rate равен `0`;
- p95 не выше `1500 ms`;
- `/health` возвращает healthy;
- `/metrics/prometheus` содержит API/cache/audit/export/runtime/threadpool метрики;
- `storydb_audit_log_queue_dropped_total` не растет;
- failed export jobs равны `0`;
- cache capacity evictions не выше установленного порога для smoke.

## k6 baseline

Если установлен k6, прогнать сценарий по реальному или временно оставленному проекту:

```powershell
$env:STORYDB_BASE_URL = "http://localhost:50201"
$env:STORYDB_EMAIL = "user@example.com"
$env:STORYDB_PASSWORD = "password"
$env:STORYDB_PROJECT_ID = "3"
$env:STORYDB_LOAD_VUS = "25"
$env:STORYDB_LOAD_DURATION = "5m"
$env:STORYDB_EXPORT_MODE = "async"
k6 run tests/load/k6-storydb-project.js
```

Минимальный проход:

- thresholds k6 проходят;
- `http_req_failed < 1%`;
- p95 общих запросов ниже `1500 ms`;
- p95 export endpoint ниже `7000 ms`;
- нет роста failed export jobs и dropped audit logs.

## Production smoke после обновления

Если Docker Hub недоступен или нельзя публиковать приватные образы во внешний registry, перенести образы tar-файлами:

```powershell
.\scripts\export-storydb-images.ps1
scp tmp\storydb-image-export\storydb-api-latest.tar root@157.22.185.96:/root/storydb/
scp tmp\storydb-image-export\storydb-client-latest.tar root@157.22.185.96:/root/storydb/
scp tmp\storydb-image-export\storydb-images-manifest.json root@157.22.185.96:/root/storydb/
```

Команды `scp` выше нужно запускать из корня репозитория. Если PowerShell открыт в `C:\Windows\System32`, используйте абсолютные пути, которые печатает `export-storydb-images.ps1`.

Загрузить их на сервере:

```bash
cd /root/storydb
docker load -i storydb-api-latest.tar
docker load -i storydb-client-latest.tar
docker compose -f docker-compose.prod.yml up -d --no-deps api client
```

Если после обновления `/live`, `/ready`, `/health` возвращают `502`, сначала смотреть API:

```bash
docker logs storydb-api --tail=120
docker inspect storydb-api --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'ConnectionStrings__StoryDb|POSTGRES'
docker inspect storydb-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' | grep POSTGRES
```

Если API был пересоздан, а `storydb-client` остался старым процессом, nginx может держать старый Docker DNS/IP upstream и продолжать отдавать `502`. После успешного старта API перезапустите client:

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps client
```

Ошибка `28P01: password authentication failed for user "postgres"` означает, что пароль в `ConnectionStrings__StoryDb` у API не совпадает с паролем существующего PostgreSQL volume. Без удаления volume можно выровнять пароль так:

```bash
cd /root/storydb
DB_PASS='put-current-compose-password-here'
docker exec storydb-postgres psql -U postgres -d storydb -c "ALTER USER postgres WITH PASSWORD '${DB_PASS}';"
POSTGRES_PASSWORD="$DB_PASS" docker compose -f docker-compose.prod.yml up -d --no-deps api
```

Если на сервере есть `.env`, лучше записать тот же `POSTGRES_PASSWORD` туда, чтобы следующие `docker compose up` не возвращались к дефолту.

После pull/build/deploy на сервере:

```bash
cd /root/storydb
bash scripts/run-production-smoke.sh
```

Если папка `scripts` не развернута на сервере, выполнить fallback вручную:

```bash
cd /root/storydb
docker compose -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:50201/live
curl -fsS http://127.0.0.1:50201/ready
curl -fsS http://127.0.0.1:50201/health
curl -fsS http://127.0.0.1:50201/metrics/prometheus | head -80
curl -I http://127.0.0.1:50201/style-preview/profile
docker exec storydb-api curl -fsS http://127.0.0.1:5282/health
docker logs storydb-api --tail=120
docker logs storydb-client --tail=80
```

Если нужно проверить API напрямую из контейнера, а не через nginx:

```bash
docker exec storydb-api curl -fsS http://127.0.0.1:5282/live
docker exec storydb-api curl -fsS http://127.0.0.1:5282/ready
docker exec storydb-api curl -fsS http://127.0.0.1:5282/health
docker exec storydb-api curl -fsS http://127.0.0.1:5282/metrics/prometheus | head -80
```

Проверить вручную в браузере:

- профиль открывается;
- существующие проекты открываются;
- старые изображения из uploads видны;
- создание/редактирование объекта работает;
- DOCX export запускается и скачивается;
- граф связей и таймлайн открываются.

## Метрики, за которыми смотреть

- `storydb_api_requests_total`
- `storydb_api_request_failures_total`
- `storydb_api_slow_requests_total`
- `storydb_api_active_requests`
- `storydb_cache_singleflight_hits_total`
- `storydb_cache_singleflight_misses_total`
- `storydb_cache_singleflight_waits_total`
- `storydb_cache_singleflight_capacity_evictions_total`
- `storydb_audit_log_queue_dropped_total`
- `storydb_export_job_queue_depth`
- `storydb_export_jobs{status="failed"}`
- `storydb_process_gc_fragmented_bytes`
- `storydb_process_gc_allocated_bytes_total`
- `storydb_threadpool_worker_threads_used`

Красные флаги:

- `/ready` не healthy;
- растет failure/slow request count на обычном чтении проекта;
- есть audit dropped;
- export queue depth не снижается;
- failed export jobs больше `0`;
- threadpool used близок к max;
- cache capacity evictions постоянно растут при обычной нагрузке.

## Команды финальной проверки перед закрытием

```powershell
dotnet build StoryDB.Api\StoryDB.Api.csproj --no-restore
dotnet build StoryDB.Api.IntegrationTests\StoryDB.Api.IntegrationTests.csproj --no-restore
dotnet test StoryDB.Api.Tests\StoryDB.Api.Tests.csproj --no-build
dotnet test StoryDB.Api.IntegrationTests\StoryDB.Api.IntegrationTests.csproj --no-build
dotnet ef migrations has-pending-model-changes --project StoryDB.Api\StoryDB.Api.csproj --startup-project StoryDB.Api\StoryDB.Api.csproj --no-build
npm run build --prefix storydb.client
node --check tests\load\smoke-load.mjs
node --check tests\load\k6-storydb-project.js
```

Цель можно закрывать только после зеленых команд выше и успешного Docker или production smoke.
