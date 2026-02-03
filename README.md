# Career-Tracker

Career-Tracker is a production-minded job application tracker built around a fast, **table-first Applications** view (Excel/Notion-style) and a **right-side details drawer** for safe viewing/editing.

The design goal is simple: **scanning stays instant** in the table, while richer details (documents, connections, notes) live in the drawer and dialogs without cluttering the grid.

---

## Production

- **App:** https://career-tracker.ca
- **Frontend:** Vercel (custom domain via Cloudflare)
- **Backend:** Google Cloud Run (Fastify API)
- **Database:** Cloud SQL (Postgres)
- **File storage:** Google Cloud Storage (private bucket) with short-lived signed URLs
- **Email:** Resend (transactional email: verification, resets, Pro/admin flows)
- **Rate limiting:** Redis (Upstash) 

---

## What you can do

### Applications (table-first + safety model)
- Browse applications in a fast table (sort/filter/paginate, hide/show columns)
- Open an application in the **details drawer** (view-first by default)
- Enter **explicit Edit mode** to make changes, then **Save/Cancel** safely
- Destructive actions are gated/confirmed to prevent accidental changes

### Documents v1 (real uploads)
- Upload PDF/TXT attachments to a private Google Cloud Storage bucket
- Download via short-lived signed URLs
- Delete removes both the DB row + the GCS object
- PDF preview uses a lightweight iframe overlay (outside the drawer)

### Connections (people / recruiters / referrals)
- Create and manage Connections globally (people you interact with)
- Attach/detach connections to specific applications
- Manage connections from Profile via a 2-pane “View all connections” modal

### AI Assist (JD extraction + FIT scoring)
- Paste a job description to extract structured fields and prefill an application
- Run FIT/compatibility scoring (gated by free credits / Pro)
- Pro access can be requested and is admin-approved

### Auth + Security
- Password auth with email verification flows
- Google OAuth sign-in (PKCE)
- Session refresh uses a refresh cookie + CSRF token (protects refresh/logout)

---

## Architecture overview (high level)

**Modules**
- `frontend/` — Next.js (App Router) + TypeScript + Tailwind (table + drawer UX, dialogs/overlays)
- `backend/` — Fastify + TypeScript API (Prisma + Postgres, user-scoped endpoints)
- `infra/` — local dev infra (Docker Compose dev/test Postgres)
- `docs/perf/k6/` — local performance benchmarks (k6 scripts + notes)
- `logo/` — branding assets

**Tech stack**
- Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (Radix)
- Fastify, TypeScript, TypeBox schemas
- Prisma + PostgreSQL
- Redis (Upstash in prod)
- Google Cloud Storage (private bucket + signed URLs)
- OpenAI API (AI features gated by credits/Pro)

> Detailed docs:
> - Frontend: `frontend/README.md`
> - Backend: `backend/README.md`

---

## Repo notes

- **Prisma source of truth:** `backend/prisma/schema.prisma` (schema + migrations live under `backend/prisma/`)
- This repo uses **npm workspaces** (root scripts run frontend + backend together)

---

## Running locally (quickstart)

### Prerequisites
- Node.js 18+
- Docker + Docker Compose (for Postgres)

### Quickstart
1) Install deps (repo root):

```bash
npm install
````

2. Start Postgres (dev):

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

3. Configure env

* Backend: create `backend/.env.local` (see `backend/.env.example` + `backend/README.md`)
* Frontend: set `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
```

4. Run both (repo root):

```bash
npm run dev
```

Default ports:

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend: [http://localhost:3002](http://localhost:3002) (API base: `/api/v1`)

> Note: Documents uploads require GCS config + credentials (details in `backend/README.md`).

---

## Testing (backend integration tests)

Backend tests are **deterministic integration tests** using:

* Vitest + Fastify inject
* Docker Postgres test DB
* Real Prisma writes (external deps mocked: storage/email/LLM)

Typical flow:

```bash
docker compose -f infra/docker-compose.test.yml up -d
npm run test --workspace=backend
```

See: `backend/README.md` for full details.

---

## Deployment (high-level)

### Frontend — Vercel

* Deploys from `frontend/` (Next.js App Router)
* Public URL: [https://career-tracker.ca](https://career-tracker.ca)
* Env var:

  * `NEXT_PUBLIC_API_BASE_URL` = `https://<CLOUD_RUN_SERVICE_URL>/api/v1`

### Backend — Google Cloud Platform (GCP)

* **Cloud Run** (Fastify API in `backend/`)
* **Cloud SQL** (Postgres)
* **Secret Manager** for sensitive env vars
* **Cloud Storage (GCS)** private bucket for Documents v1 (signed URLs for download)

---

## Quick links

* Frontend docs: `frontend/README.md`
* Backend docs: `backend/README.md`
* Benchmarks: `docs/perf/k6/benchmarks/README.md`
* Privacy: `PRIVACY.md`

---

*Last updated: 2026-02-02*
