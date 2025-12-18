# Career-Tracker Backend (API)

Fastify + TypeScript REST API for Career-Tracker. Provides JWT auth, user-scoped job application CRUD, consistent response shapes, validation, rate limiting, and repeatable k6 performance benchmarks.

---

## Tech Stack

- **Runtime:** Node.js, TypeScript
- **Web framework:** Fastify
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation / DTOs:** TypeBox schemas + TS types
- **Auth:** JWT (Bearer token)
- **Security:** rate limiting on auth routes, user-scoped data access
- **Logging / Errors:** centralized error handler, structured logs
- **Performance testing:** k6 (safe summary exports saved to repo)

---

## Key Features

### Authentication + Security
- **POST `/api/v1/auth/login`** returns JWT
- Protected routes use a `requireAuth` preHandler that attaches `req.user`
- **Rate limiting** applied to auth endpoints to reduce brute-force attempts
- All application operations are **scoped to the authenticated user** (no cross-user access)

### Job Applications
- **Create:** `POST /api/v1/applications`
- **List:** `GET /api/v1/applications`
  - Supports pagination + sorting + filters:
    - `page`, `pageSize`
    - `sortBy=updatedAt|createdAt|company`
    - `sortDir=asc|desc`
    - `status`
    - `q` (searches company/position)
  - Returns a stable shape:
    ```json
    {
      "items": [...],
      "page": 1,
      "pageSize": 20,
      "total": 200,
      "totalPages": 10
    }
    ```
- **Read one:** `GET /api/v1/applications/:id`
- **Update (PATCH semantics):** `PATCH /api/v1/applications/:id`
  - Only applies fields the client actually provided
  - Date strings can be converted to `Date` for Prisma
- **Delete:** `DELETE /api/v1/applications/:id`

### Consistency + Correctness Notes
- Listing uses a **Prisma transaction** to keep `count + items` consistent during pagination:
  - prevents “total changed while paging” weirdness under write load
- Update uses a user-scoped approach (e.g., `updateMany` with `{ id, userId }`) so ownership is always enforced.

---

## Project Setup

### Prerequisites
- Node.js (LTS recommended)
- PostgreSQL running locally or via Docker
- Prisma CLI available via `npx prisma ...`

### Environment Variables
Create a `.env`:
- `DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB"`
- `JWT_SECRET="your_long_random_secret"`
- `PORT=3002` (optional)

### Install + Run
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
````

Server should start on:

* `http://localhost:3002` (example)
* API base: `http://localhost:3002/api/v1`

---

## API Quickstart (Postman)

1. Login:

* `POST /api/v1/auth/login`
* Body:

  ```json
  { "email": "seed_metrics@example.com", "password": "Password123!" }
  ```

2. Use the JWT:

* Add header:

  * `Authorization: Bearer <token>`

3. List applications:

* `GET /api/v1/applications?page=1&pageSize=20&sortBy=updatedAt&sortDir=desc`

---

## Benchmarks (k6)

### Why we store “safe exports”

k6’s default full JSON summaries can include `setup_data` (which can contain your JWT token).
So the benchmark scripts export a **safe JSON** that stores only the metrics we care about.

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

> Note: These are **local** benchmarks (good for iteration). The next step for “resume-grade” numbers is re-running the same suite after deployment (Cloud Run + Cloud SQL).

---

## What’s Next (Backend Improvements)

Productionizing / polish:

* Deploy to **Cloud Run + Cloud SQL**
* Re-run the same k6 suite to capture **production-like** p50/p95 + throughput
* Add CI (lint/typecheck + migrations sanity)
* Add deeper observability (request tracing, structured error codes, metrics export)
* Expand test coverage (integration tests for core endpoints)

## TODO / Next (Backend)

* **Deploy + prod parity**

  * Deploy API (Cloud Run/Render/Fly) + managed Postgres; re-run k6 against prod-like infra and record results.
  * Add DB migrations workflow + environment config checklist.

* **Auth & security**

  * Refresh tokens + token rotation (optional), logout/invalidate, “remember me”.
  * Password reset flow + email verification (optional).
  * Tighten rate-limit strategy (separate limits for login/register/reset; key by IP + email).

* **Validation & errors**

  * Standardize error shape for all failures (validation, auth, not found, rate limit).
  * Improve 429 messaging/headers for client UX (Retry-After, consistent response body).

* **Data model / querying**

  * Add indexes based on real queries (e.g., `(userId, updatedAt)`, `(userId, status)`).
  * Add more filters (date ranges, status multi-select, company/position exact match).
  * Cursor-based pagination (optional) for large datasets.

* **Testing & quality**

  * Add unit tests for services + route tests (happy path + auth + validation).
  * CI checks (lint, typecheck, tests) + simple coverage reporting.

* **Observability**

  * Structured logging (requestId/userId), request timing, and error alerts.
  * Basic health checks + metrics endpoint (optional).

* **API polish**

  * OpenAPI/Swagger docs (Fastify plugin) generated from schemas.
  * Response DTO consistency across all routes (select-only, no leaks).

* **Nice-to-haves**

  * Bulk operations (bulk status update, bulk delete).
  * Export endpoints (CSV/JSON), import, and “archive” instead of delete.


---

_Frontend work can start now — the backend surface is stable enough.  
Last updated: 2025-12-18_


