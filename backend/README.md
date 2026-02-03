# Career-Tracker — Backend (Fastify API)

Fastify + TypeScript API powering Career-Tracker.

- All data access is **user-scoped** (JWT → `req.user.id`)
- Core list endpoints return a **stable paginated shape**
- Most user-facing routes require **verified email**
- AI routes are gated by **free credits / Pro** and enforced server-side

_This README focuses on backend architecture, auth/session model, and the main API surfaces. Frontend and benchmarks have their own docs._

---

## Tech stack

- Fastify + TypeScript
- Prisma + PostgreSQL
- TypeBox (runtime request validation + derived TS types)
- Auth/session:
  - Access token (JWT) in `Authorization: Bearer <token>`
  - Refresh token in an **httpOnly cookie**
  - CSRF token required for refresh/logout
- Google OAuth (PKCE)
- Rate limiting: `@fastify/rate-limit` (Redis-backed)
- Documents:
  - `@fastify/multipart`
  - Google Cloud Storage private bucket + signed URLs
- Email: Resend (verification, password reset, Pro/admin workflows)
- AI: OpenAI API (gated)

---

## Folder structure + module pattern

Backend follows a simple “modules” pattern:

```txt
backend/
  app.ts                  # Fastify buildApp() + plugin + route mounting
  server.ts               # dev server entry (loads .env.local)
  types/
    fastify.d.ts          # FastifyRequest type augmentation (req.user)
  lib/
    prisma.ts             # Prisma client singleton
    env.ts                # minimal env validation (fail fast)
    redis.ts              # redis client
    gcs.ts                # GCS config parsing + Storage client (ADC)
  errors/
    app-error.ts          # AppError for consistent status + codes
  middleware/
    auth.ts               # requireAuth (JWT -> req.user)
    require-verified-email.ts
    require-ai-access.ts
    require-admin.ts
    error-handler.ts      # consistent API errors + 404 handler
  modules/
    auth/                 # register/login/me + sessions + email flows
    oauth/                # Google OAuth PKCE start/callback
    user/                 # profile endpoints
    applications/         # CRUD + list + docs + connections + AI artifacts
    documents/            # base resume + download/delete
    connections/          # global connections CRUD/list/search
    ai/                   # JD extraction (standalone AI endpoint)
    pro/                  # Pro access request
    admin/                # admin Pro approvals + credit grants
    debug/                # dev-only routes (seed)
  prisma/
    schema.prisma
    migrations/
  tests/
    _helpers/             # docker db lifecycle + factories + shared helpers
    ...                   # integration test suites by module
````

Convention:

* `*.routes.ts` = routing + request parsing + response shaping
* `*.service.ts` = Prisma + business rules
* `*.schemas.ts` = TypeBox schemas
* `*.dto.ts` = shared “public select shapes” + input types

---

## Auth + session model

### Access token (JWT)

Most protected routes require:

* Header: `Authorization: Bearer <accessToken>`
* Middleware: `middleware/auth.ts` (`requireAuth`)
* `req.user` is attached as `{ id, email }` (see `backend/types/fastify.d.ts`)

### Refresh cookie + CSRF

Sessions use a refresh cookie + CSRF token to protect refresh/logout endpoints.

* Refresh cookie name: `career_tracker_refresh`
* Cookie is **httpOnly** and scoped to path: `/api/v1/auth`
* In prod: `secure: true`, `sameSite: "none"` (cross-site cookies for deployed frontend)
* In local dev: `secure: false`, `sameSite: "lax"`

Endpoints:

* `GET  /api/v1/auth/csrf`

  * If refresh cookie exists: returns `{ csrfToken: "..." }`
  * If no session: returns `{ csrfToken: null }`
* `POST /api/v1/auth/refresh`

  * Requires refresh cookie + `X-CSRF-Token` header
  * Rotates refresh token + rotates CSRF token
* `POST /api/v1/auth/logout`

  * Requires `X-CSRF-Token` (best-effort revoke) and clears cookie

Security enforcement:

* Refresh/logout also enforce a strict **Origin allowlist** using `CORS_ORIGIN`.

---

## Consistent errors

Global handlers:

* `middleware/error-handler.ts`

Response shape is intentionally simple:

```json
{ "message": "..." }
```

* `AppError` → uses its status code + message
* Validation / 4xx → returned consistently
* Unexpected → `500 { "message": "Internal Server Error" }`

---

## Route mounting + base paths

Mounted in `backend/app.ts`:

* Health: `GET /health`
* Auth: `/api/v1/auth`
* OAuth: `/api/v1/auth/oauth`
* Users: `/api/v1/users`
* Applications: `/api/v1/applications`
* Documents: `/api/v1/documents`
* Connections: `/api/v1/connections`
* AI: `/api/v1/ai`
* Pro: `/api/v1/pro`
* Admin: `/api/v1/admin`
* Debug: `/api/debug/*` (only when `ENABLE_DEBUG_ROUTES="true"`)

---

## Core endpoints (high level)

### Auth

* `POST /api/v1/auth/register` (rate-limited)
* `POST /api/v1/auth/login` (rate-limited)
* `GET  /api/v1/auth/me`

Sessions:

* `GET  /api/v1/auth/csrf`
* `POST /api/v1/auth/refresh`
* `POST /api/v1/auth/logout`

Email verification + password reset:

* `POST /api/v1/auth/verify-email`
* `POST /api/v1/auth/resend-verification` (non-enumerating)
* `POST /api/v1/auth/forgot-password` (non-enumerating)
* `POST /api/v1/auth/reset-password`

### Google OAuth (PKCE)

* `GET /api/v1/auth/oauth/google/start`
* `GET /api/v1/auth/oauth/google/callback`

### User / Profile

* `GET   /api/v1/users/me`
* `PATCH /api/v1/users/me`

### Applications (table-first UX)

* `POST   /api/v1/applications`
* `GET    /api/v1/applications`
* `GET    /api/v1/applications/:id`
* `PATCH  /api/v1/applications/:id`
* `DELETE /api/v1/applications/:id`

List query params (see `modules/applications/applications.schemas.ts`):

* Filters: `q`, `status`, `jobType`, `workMode`, `isFavorite=true|false`
* Fit filter: `fitMin`, `fitMax` (when provided; excludes null)
* Pagination: `page`, `pageSize`
* Sorting: `sortBy`, `sortDir=asc|desc`

  * Nullable sortable fields force **nulls last** (asc + desc)

### Application documents

* `GET  /api/v1/applications/:id/documents`
* `POST /api/v1/applications/:id/documents` (multipart upload)

### Application connections (attach/detach)

* `GET    /api/v1/applications/:id/connections`
* `POST   /api/v1/applications/:id/connections/:connectionId`
* `DELETE /api/v1/applications/:id/connections/:connectionId`

### AI (JD extraction + AI artifacts)

Standalone JD extraction:

* `POST /api/v1/ai/application-from-jd` (requires verified email + AI access)

Per-application AI artifacts:

* `POST /api/v1/applications/:id/ai-artifacts`

  * Supported `kind`: `JD_EXTRACT_V1`, `FIT_V1`
* `GET  /api/v1/applications/:id/ai-artifacts`

AI gating rules:

* `requireVerifiedEmail` blocks unverified users
* `requireAiAccess` blocks users without free quota or Pro

### Pro

* `POST /api/v1/pro/request` (rate-limited per user)

### Admin (Pro approvals + credits)

* `GET  /api/v1/admin/pro-requests`
* `POST /api/v1/admin/pro-requests/:requestId/approve`
* `POST /api/v1/admin/pro-requests/:requestId/deny`
* `POST /api/v1/admin/pro-requests/:requestId/grant-credits`

---

## Documents (GCS uploads + signed URLs)

Documents are real uploads to a private GCS bucket with short-lived signed URLs.

### Application documents (attach to a job application)

Routes live under `modules/applications/applications.routes.ts`:

* `GET  /api/v1/applications/:id/documents`

  * Returns `{ documents: Document[] }`
* `POST /api/v1/applications/:id/documents`

  * `multipart/form-data` with one `file`
  * Optional query: `?kind=RESUME|COVER_LETTER|CAREER_HISTORY|OTHER`
  * Uploads stream → writes GCS object → creates `Document` row
  * Touches `JobApplication.updatedAt`

Safeguards:

* Max docs per application is capped
* File size enforced via multipart limits + truncation check
* Allowed MIME types default to PDF/TXT (configurable via env)

### Download + delete (by document id)

Routes live under `modules/documents/documents.routes.ts`:

* `GET /api/v1/documents/:id/download`

  * Returns `{ downloadUrl: "https://..." }`
  * Optional query: `?disposition=inline|attachment`
* `DELETE /api/v1/documents/:id`

  * Deletes GCS object (best-effort) + deletes DB row
  * Touches parent application `updatedAt` when applicable

### GCS configuration

Helper: `lib/gcs.ts`

Env vars:

* `GCS_BUCKET` (**required** for uploads)
* `GCS_KEY_PREFIX` (optional; e.g. `dev` / `prod`)
* `GCS_MAX_UPLOAD_BYTES` (default ~10MB)
* `GCS_SIGNED_URL_TTL_SECONDS` (default ~10 minutes)
* `GCS_ALLOWED_MIME_TYPES` (optional; defaults to `application/pdf,text/plain`)

Auth to GCS:

* Cloud Run: Application Default Credentials (service account)
* Local dev: set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON if needed

---

## Connections (global + attach to applications)

### Global connections (CRUD + list/search)

Routes: `modules/connections/connections.routes.ts`

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

Routes: `modules/applications/applications.routes.ts`

* `GET    /api/v1/applications/:id/connections`

  * Returns `{ connections: ConnectionWithAttachedAt[] }`
* `POST   /api/v1/applications/:id/connections/:connectionId`

  * Upserts join row (idempotent attach)
  * Touches `JobApplication.updatedAt`
* `DELETE /api/v1/applications/:id/connections/:connectionId`

  * Deletes join row (if present)
  * Touches `JobApplication.updatedAt`

---

## Local development

### 1) Start Postgres (Docker)

From repo root:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

Dev DB is exposed on `localhost:5437`.

### 2) Environment files (important)

* `backend/.env` is mainly for Prisma tooling (Prisma doesn’t read `.env.local`)
* `backend/.env.local` is loaded by `backend/server.ts` for runtime (dev)

Minimum required runtime vars:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5437/career_tracker?schema=public"
JWT_SECRET="dev_change_me"
```

Recommended local values (to match your deployed frontend):

```env
CORS_ORIGIN="http://localhost:3000,https://career-tracker.ca"
FRONTEND_URL="http://localhost:3000"
```

Email (required for verification/reset flows in production; optional locally):

```env
RESEND_API_KEY="..."
EMAIL_FROM="Career-Tracker <no-reply@yourdomain>"
FRONTEND_URL="http://localhost:3000"
```

Google OAuth (optional locally):

```env
GOOGLE_OAUTH_CLIENT_ID="..."
GOOGLE_OAUTH_CLIENT_SECRET="..."
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3002/api/v1/auth/oauth/google/callback"
```

AI (optional locally):

```env
OPENAI_API_KEY="..."
```

Documents (optional locally):

```env
GCS_BUCKET="private-bucket-name"
GCS_KEY_PREFIX="dev"
GCS_MAX_UPLOAD_BYTES="10485760"
GCS_SIGNED_URL_TTL_SECONDS="600"
# optional:
# GCS_ALLOWED_MIME_TYPES="application/pdf,text/plain"
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

## Testing (deterministic integration tests)

Tests use:

* Vitest + Fastify inject
* Docker Postgres test DB (real Prisma writes)
* External dependencies mocked (storage/email/LLM) where needed
* Rate limiting is disabled automatically in test env (`NODE_ENV="test"`)

### 1) Start test Postgres

From repo root:

```bash
docker compose -f infra/docker-compose.test.yml up -d
```

Test DB is exposed on `localhost:5438`.

### 2) Run tests

From `backend/`:

```bash
npm run test
```

The test harness applies env defaults + runs migrations automatically (see `tests/_helpers/globalSetup.ts`).

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
* Set `CORS_ORIGIN` to your deployed frontend origin(s), e.g. `https://career-tracker.ca`
* Rate limiting:

  * Provide `REDIS_URL` in production for consistent rate limiting across instances
* Email:

  * `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` should be set in production
* OAuth:

  * `GOOGLE_OAUTH_*` vars required if enabling Google sign-in
* Documents:

  * Ensure Cloud Run service account has GCS permissions (read/write/delete)
* Database:

  * Cloud SQL connector / unix socket + a Cloud Run–friendly `DATABASE_URL`

---

## Benchmarks (k6)

Benchmark scripts + notes live here:

* `../docs/perf/k6/`

Saved results live here:

* `../docs/perf/k6/benchmarks/results/`

Run instructions + output conventions:

* `../docs/perf/k6/benchmarks/README.md`

---

## Quick links

- Root overview: `../README.md`
- Frontend docs: `../frontend/README.md`
- Benchmarks: `../docs/perf/k6/benchmarks/README.md`

---

*Last updated: 2026-02-02*