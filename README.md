# Career-Tracker

Career-Tracker is a full-stack **job application manager** built to replace messy spreadsheets, scattered notes, and lost job links with a single, focused workspace. It centralizes applications, statuses, documents, contacts, and analytics so job seekers can see exactly where they stand and what to do next.

Under the hood it uses a typed Fastify + Postgres API and a React/Next.js frontend with secure auth, robust validation, and fast, filterable tables. 

AI assistance and full GCP deployment (Cloud Run, Cloud SQL, GCS) are part of the planned roadmap: parsing job descriptions into structured fields, summarizing postings, assessing resume fit, and generating tailored cover-letter drafts, all backed by CI/CD and runtime metrics.

---

## Architecture overview

**Modules:**
- `frontend/`  
  Next.js App Router app (TypeScript + Tailwind). Auth + protected routes, Applications dashboard, Profile + Base Resume metadata.

- `backend/`  
  Fastify + TypeScript REST API with JWT auth, rate limiting, TypeBox validation, and user-scoped CRUD for applications. Uses Prisma + PostgreSQL.

- `infra/`  
  Local development infrastructure (Docker Compose Postgres).

**Key technologies:**
- Next.js (App Router), React, TypeScript, Tailwind CSS
- Fastify, TypeScript, TypeBox validation
- Prisma + PostgreSQL
- JWT auth + rate limiting
- k6 load testing (local)

---

## Backend (API)
- Built a **Fastify + TypeScript** REST API with **JWT auth**, **rate limiting**, and **TypeBox validation**
- Implemented **user-scoped CRUD** for job applications with **pagination, sorting, status filters, and search**
- Used **Prisma + PostgreSQL**, including transactional pagination (`count + items`) for consistent list results under write load
- Load tested with **k6** (10 VUs, 20s, local):  
  - `GET /applications` p95 **~13-20ms** on **200–1000** records  
  - `POST /applications` p95 **~18-22ms**  
  - `PATCH /applications/:id` p95 **~28-30ms**  
  - **0% request failures** across runs  
- Future: deploy to Cloud Run + Cloud SQL and repeat benchmarks for production-like metrics

## Frontend (Web)
- Built a **Next.js (App Router) + TypeScript** frontend with **Tailwind** and light shadcn/ui usage
- Implemented auth flow end-to-end (register/login/logout) with **refresh-safe rehydration** via `GET /users/me`
- Added protected routing using route groups: `(public)` auth pages vs `(app)` authenticated pages
- Applications dashboard: list/create/update status/delete + basic search/filter/sort/reset
- Profile page: update name + Base Resume metadata CRUD (MVP: URL/metadata only)

---

## Running locally

### Prerequisites
- Node.js 18+
- A PostgreSQL instance (Docker + Docker Compose)

### Quickstart
1. Install:
```bash
npm install
````

2. Start Postgres (local dev):

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

3. Backend env (`backend/.env`):

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_dev_secret
CORS_ORIGIN=http://localhost:3000
```

4. Frontend env (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
```

5. Run backend + frontend:

```bash
npm run dev
```

Default ports: frontend `3000`, backend `3002`.

Frontend: [http://localhost:3000](http://localhost:3000)
API: [http://localhost:3002/api/v1](http://localhost:3002/api/v1)

---


_Last updated: 2025-12-23_
