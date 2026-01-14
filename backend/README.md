# Career-Tracker — Backend (Fastify API)

Fastify + TypeScript API powering Career-Tracker. All data access is **user-scoped** (JWT → `req.user.id`), and core list endpoints return a stable paginated shape.

This README documents the current backend architecture, key endpoints, and the Documents v1 + Connections modules that were added after the early MVP.

---

## Tech stack

- Fastify + TypeScript
- Prisma + PostgreSQL
- TypeBox (runtime request validation + derived TS types)
- JWT auth (`Authorization: Bearer <token>`)
- Documents v1: `@fastify/multipart` + Google Cloud Storage private bucket + signed URLs

---

## Folder structure + module pattern

Backend follows a simple “modules” pattern:

```

backend/
app.ts                      # fastify app + plugin + route mounting
server.ts                   # boots server + loads .env.local (dev)
lib/
prisma.ts                 # Prisma client singleton
env.ts                    # minimal env validation (fail fast)
gcs.ts                    # GCS config parsing + Storage client (ADC)
middleware/
auth.ts                   # requireAuth (JWT -> req.user)
error-handler.ts          # consistent API errors + 404 handler
modules/
auth/                     # login/register/me
user/                     # profile endpoints
applications/             # CRUD + list + app-level docs + app-level connections
documents/                # doc download/delete + base resume endpoints
connections/              # global connections CRUD/list/search
debug/                    # dev-only routes (seed)

````

Convention:
- `*.routes.ts` = routing + request parsing + response shaping
- `*.service.ts` = Prisma + business rules
- `*.schemas.ts` = TypeBox request schemas
- `*.dto.ts` = shared “public select shapes” + service input types

---

## Auth + request model

### JWT auth
Middleware:
- `middleware/auth.ts` (`requireAuth`)

Behavior:
- Requires `Authorization: Bearer <token>`
- Verifies token with `JWT_SECRET`
- Attaches `{ id, email }` to `req.user`

### Consistent errors
Global handlers:
- `middleware/error-handler.ts`

Response shape is intentionally simple:
```json
{ "message": "..." }
````

* `AppError` → uses its status code + message (logged as warn)
* Validation / 4xx → returned consistently (logged as warn)
* Unexpected → `500 { message: "Internal Server Error" }` (logged as error)

---

## Route mounting + base paths

Mounted in `backend/app.ts`:

* Health: `GET /health`
* Auth: `/api/v1/auth`
* Users: `/api/v1/users`
* Applications: `/api/v1/applications`
* Documents: `/api/v1/documents`
* Connections: `/api/v1/connections`
* Debug: `/api/debug/*` (only when `ENABLE_DEBUG_ROUTES="true"`)

---

## Core endpoints

### Auth

* `POST /api/v1/auth/register` (rate-limited)
* `POST /api/v1/auth/login` (rate-limited)
* `GET  /api/v1/auth/me`

### User / Profile

* `GET   /api/v1/users/me`
* `PATCH /api/v1/users/me`

### Applications (table-first UX)

* `POST   /api/v1/applications`
* `GET    /api/v1/applications`
* `GET    /api/v1/applications/:id`
* `PATCH  /api/v1/applications/:id`
* `DELETE /api/v1/applications/:id`

**List query params** (see `modules/applications/applications.schemas.ts`):

* Filters:

  * `q` (search company/position)
  * `status`
  * `jobType`
  * `workMode`
  * `isFavorite=true|false`
* Pagination:

  * `page`, `pageSize`
* Sorting:

  * `sortBy` (ex: `updatedAt`, `createdAt`, `company`, `position`, `dateApplied`, `isFavorite`, etc.)
  * `sortDir=asc|desc`

Response shape:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 200,
  "totalPages": 10
}
```

---

## Documents v1

Documents v1 are **real file uploads** to a **private GCS bucket**, with short-lived signed URLs for access.

### Application documents (attach to a job application)

Routes live under `modules/applications/applications.routes.ts`:

* `GET  /api/v1/applications/:id/documents`

  * Returns `{ documents: Document[] }`
* `POST /api/v1/applications/:id/documents`

  * `multipart/form-data` with one `file`
  * Optional query param: `?kind=RESUME|COVER_LETTER|OTHER`
  * Uploads file → writes GCS object → creates `Document` row
  * Touches `JobApplication.updatedAt` (so recency ordering updates immediately)
  * Returns `201 { document: Document }`

Server-side safeguards:

* Max docs per application is capped (guardrail)
* File size is enforced via Fastify multipart limits + truncation check
* Allowed MIME types default to PDF/TXT (configurable via env)

### Download + delete (by document id)

Routes live under `modules/documents/documents.routes.ts`:

* `GET /api/v1/documents/:id/download`

  * Returns a signed URL:

    ```json
    { "downloadUrl": "https://..." }
    ```
  * Optional query: `?disposition=inline|attachment`

* `DELETE /api/v1/documents/:id`

  * Deletes GCS object (best-effort) + deletes DB row
  * Touches parent application `updatedAt` if the doc belonged to an application

### GCS configuration

Config helper:

* `lib/gcs.ts`

Env vars used:

* `GCS_BUCKET` (**required** for uploads)
* `GCS_KEY_PREFIX` (optional; ex: `dev` / `prod` to separate keys)
* `GCS_MAX_UPLOAD_BYTES` (default ~10MB)
* `GCS_SIGNED_URL_TTL_SECONDS` (default ~10 minutes)
* `GCS_ALLOWED_MIME_TYPES` (optional; defaults to `application/pdf,text/plain`)

Auth to GCS:

* In Cloud Run: uses **Application Default Credentials** (runtime service account)
* Local dev: set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON if needed

---

## Connections (global + attach to applications)

### Global connections (CRUD + list/search)

Routes live under `modules/connections/connections.routes.ts`:

* `POST   /api/v1/connections`
* `GET    /api/v1/connections`
* `GET    /api/v1/connections/:id`
* `PATCH  /api/v1/connections/:id`
* `DELETE /api/v1/connections/:id`

List/search query params (see `modules/connections/connections.schemas.ts`):

* `q` (text search across key fields)
* field filters: `name`, `company`, `relationship`
* `status` (boolean-safe; `false` is preserved)
* pagination: `page`, `pageSize`
* sorting: `sortBy`, `sortDir`

Returns the same paginated shape as applications list.

### Attach/detach connections to an application

Routes live under `modules/applications/applications.routes.ts`:

* `GET    /api/v1/applications/:id/connections`

  * Returns `{ connections: ConnectionWithAttachedAt[] }`
  * Backend flattens join rows into `{ ...connectionFields, attachedAt }`

* `POST   /api/v1/applications/:id/connections/:connectionId`

  * Upserts the join row (idempotent attach)
  * Touches `JobApplication.updatedAt`

* `DELETE /api/v1/applications/:id/connections/:connectionId`

  * Deletes the join row if present
  * Touches `JobApplication.updatedAt`

---

## Local development

### 1) Start Postgres (Docker)

From repo root:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

This exposes Postgres on `localhost:5437`.

### 2) Environment files (important)

* `backend/.env` is mainly for Prisma tooling (Prisma doesn’t read `.env.local`)
* `backend/.env.local` is loaded by `backend/server.ts` for runtime (dev)

Minimum required runtime vars:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5437/career_tracker?schema=public"
JWT_SECRET="dev_change_me"
```

If using Documents v1 locally:

```env
GCS_BUCKET="private-bucket-name"
GCS_KEY_PREFIX="dev"
GCS_MAX_UPLOAD_BYTES="10485760"
GCS_SIGNED_URL_TTL_SECONDS="600"
# optional:
# GCS_ALLOWED_MIME_TYPES="application/pdf,text/plain"
```

CORS (comma-separated):

```env
CORS_ORIGIN="http://localhost:3000"
```

### 3) Install + migrate + run

From `backend/`:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Server defaults to:

* `http://localhost:3002`
* health: `GET /health`

---

## Debug routes (dev-only)

Mounted only when:

```env
ENABLE_DEBUG_ROUTES="true"
```

* `POST /api/debug/seed` — local seeding helper (kept out of prod by flag)

---

## Deployment notes (Cloud Run style)

* Cloud Run provides `PORT` (often `8080`) — backend reads `process.env.PORT`
* Set `CORS_ORIGIN` to the deployed frontend origin(s) only
* For GCS: ensure the Cloud Run service account has access to the bucket (read/write/delete)
* For Cloud SQL: use a Cloud SQL connector / unix socket + a Cloud Run–friendly `DATABASE_URL`

---

## Benchmarks (k6)

Saved results live in:

* `k6/benchmarks/results/`

### Benchmark conditions

All runs below were executed locally with:

* **10 VUs**
* **20s duration**
* **<1% failure threshold**
* Seeded datasets: **200** and **1000** applications for the same user

### Results summary (local)

**Median and p95 are the headline numbers** (typical + worst-case tail latency).

| Endpoint                | Dataset | Page size | Load         |   Median |      p95 |  Throughput |
| ----------------------- | ------: | --------: | ------------ | -------: | -------: | ----------: |
| GET /applications       |     200 |        20 | 10 VUs / 20s | ~8.75ms  | ~15.92ms | ~46.8 req/s |
| GET /applications       |     200 |       100 | 10 VUs / 20s | ~7.97ms  | ~13.39ms | ~47.1 req/s |
| GET /applications       |    1000 |        20 | 10 VUs / 20s | ~13.73ms | ~19.15ms | ~45.7 req/s |
| GET /applications       |    1000 |       100 | 10 VUs / 20s | ~8.98ms  | ~15.43ms | ~46.8 req/s |
| POST /applications      |     200 |         - | 10 VUs / 20s | ~12.69ms | ~18.93ms | ~46.2 req/s |
| POST /applications      |    1000 |         - | 10 VUs / 20s | ~12.85ms | ~21.24ms | ~46.1 req/s |
| PATCH /applications/:id |     200 |         - | 10 VUs / 20s | ~22.70ms | ~28.40ms | ~44.4 req/s |
| PATCH /applications/:id |    1000 |         - | 10 VUs / 20s | ~22.82ms | ~29.13ms | ~44.4 req/s |

> Note: These are **local** benchmarks 
---

*Last updated: 2026-01-14*