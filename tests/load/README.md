# StoryDB load tests

These scripts are smoke-oriented k6 scenarios for finding the first bottlenecks in a real StoryDB project.
They do not seed data and do not store credentials in the repository.

## Quick Node smoke

Use this when k6 is not installed or when you only need a fast local regression check.
Without credentials it checks diagnostics endpoints; with credentials and a project id it also checks the main project-read APIs.

```powershell
$env:STORYDB_BASE_URL = "http://localhost:50201"
$env:STORYDB_SMOKE_TOTAL = "150"
$env:STORYDB_SMOKE_CONCURRENCY = "15"
node tests/load/smoke-load.mjs
```

Optional authenticated project pass:

```powershell
$env:STORYDB_EMAIL = "user@example.com"
$env:STORYDB_PASSWORD = "password"
$env:STORYDB_PROJECT_ID = "3"
node tests/load/smoke-load.mjs
```

Temporary authenticated pass without real credentials:

```powershell
$env:STORYDB_SMOKE_CREATE_PROJECT = "1"
node tests/load/smoke-load.mjs
```

This creates a temporary local user and project, runs authenticated project-read requests, and deletes the temporary project by default.
Set `STORYDB_SMOKE_CLEANUP_PROJECT=0` if you want to inspect the generated project afterward.

Seed a temporary project before the read pass:

```powershell
$env:STORYDB_SMOKE_CREATE_PROJECT = "1"
$env:STORYDB_SMOKE_SEED_OBJECTS = "20"
$env:STORYDB_SMOKE_SEED_EVENTS = "30"
$env:STORYDB_SMOKE_SEED_STRUCTURES = "1"
$env:STORYDB_SMOKE_READ_PASSES = "2"
node tests/load/smoke-load.mjs
```

Optional gates:

```powershell
$env:STORYDB_SMOKE_MAX_FAILURE_RATE = "0"
$env:STORYDB_SMOKE_MAX_P95_MS = "1500"
$env:STORYDB_SMOKE_MAX_AUDIT_DROPPED = "0"
$env:STORYDB_SMOKE_MAX_CACHE_CAPACITY_EVICTIONS = "25"
$env:STORYDB_SMOKE_MAX_EXPORT_FAILED_JOBS = "0"
$env:STORYDB_SMOKE_REQUIRE_DIAGNOSTICS = "1"
```

The smoke report also includes a final diagnostics snapshot from `/health` and `/metrics/prometheus`,
including API cache hit/miss/wait/eviction counters, audit queue counters, export queue counters,
current process memory values, GC counters, and .NET thread pool usage. Set `STORYDB_SMOKE_REQUIRE_DIAGNOSTICS=1` when the frontend/API
deployment should expose these endpoints; otherwise the report records missing diagnostics without failing
older local containers.

When running against the Vite dev server on `localhost:50201`, diagnostics are proxied to
`http://localhost:5282` by default. Override this with `VITE_API_PROXY_TARGET` if the API listens elsewhere.

## Project browsing and export

Run against a local Docker deployment:

```powershell
$env:STORYDB_BASE_URL = "http://localhost:50201"
$env:STORYDB_EMAIL = "user@example.com"
$env:STORYDB_PASSWORD = "password"
$env:STORYDB_PROJECT_ID = "3"
k6 run tests/load/k6-storydb-project.js
```

Optional knobs:

```powershell
$env:STORYDB_LOAD_VUS = "25"
$env:STORYDB_LOAD_DURATION = "5m"
$env:STORYDB_LOAD_SLEEP_SECONDS = "1"
$env:STORYDB_EXPORT_OBJECT_LIMIT = "5"
$env:STORYDB_EXPORT_OBJECT_IDS = "1,2,3"
$env:STORYDB_EXPORT_MODE = "async"
$env:STORYDB_EXPORT_JOB_POLLS = "20"
$env:STORYDB_EXPORT_JOB_POLL_SLEEP_SECONDS = "0.5"
$env:STORYDB_EXPORT_TIMEOUT = "45s"
```

The scenario covers:

- auth and profile;
- health and metrics diagnostics;
- project list;
- object summaries;
- catalogs and attributes;
- structures, usages and assignments;
- relation graph and layout;
- timeline events, links and layout;
- Word dossier export, either direct or asynchronous via the server export queue.

Use the result as a regression baseline before and after query, cache, background-worker or infrastructure changes.
