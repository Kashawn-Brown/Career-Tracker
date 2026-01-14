<p align="center">
  <img src="./CareerTrackerLogo.png" alt="Career-Tracker Logo" width="240" />
</p>

# Career-Tracker

Career-Tracker is a personal job application tracker built around a fast, **table-first Applications** view (Excel/Notion-style) and a **right-side details drawer** for safe viewing/editing.

The design goal is simple: **scanning stays instant** in the table, while richer details (documents, connections, notes) live in the drawer and dialogs—without cluttering the grid.

---

## What you can do

### Applications (table-first + safety model)
- Browse applications in a fast table (sort/filter/paginate, hide/show columns)
- Open an application in the **details drawer** (view-first by default)
- Enter **explicit Edit mode** to make changes, then **Save/Cancel** safely
- Destructive actions are gated/confirmed to prevent accidental changes

### Documents v1 (real uploads)
- Upload **PDF/TXT** attachments to a **private Google Cloud Storage bucket**
- Download via **short-lived signed URLs**
- Delete removes both the **DB row + the GCS object**
- PDF preview uses a lightweight **iframe overlay** (outside the drawer)

### Connections (people / recruiters / referrals)
- Create and manage Connections globally (people you interact with)
- Attach/detach connections to specific applications (intentional confirm flow)
- Manage connections from Profile via a 2-pane “View all connections” modal

---

## Architecture overview (high level)

**Modules**
- `frontend/` — Next.js (App Router) + TypeScript + Tailwind (table + drawer UX, dialogs/overlays)
- `backend/` — Fastify + TypeScript API (Prisma + Postgres, user-scoped endpoints)
- `infra/` — local dev infra (Docker Compose Postgres)
- `k6/` — local performance benchmarks
- `frontend_legacy/`, `backend_legacy/` — legacy reference only (not the active codepath)

**Tech stack**
- Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (Radix)
- Fastify, TypeScript, TypeBox schemas
- Prisma + PostgreSQL
- Google Cloud Storage (private bucket + signed URLs)

> Detailed docs:
> - Frontend: `frontend/README.md`
> - Backend: `backend/README.md`

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

2. Start Postgres:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

3. Configure env:

* Backend: `backend/.env` (see `backend/.env.example` + `backend/README.md`)
* Frontend: `frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
```

4. Run both:

```bash
npm run dev
```

Default ports:

* Frontend: `http://localhost:3000`
* Backend: `http://localhost:3002` (API base: `/api/v1`)

> Note: Documents uploads require GCS config + credentials (details in `backend/README.md`).

---

## Deployment

* Backend is designed for Cloud Run + Cloud SQL (Postgres)
* Frontend is designed for Vercel

Deployment wiring and required environment variables are documented in:

* `backend/README.md` (API + GCS + env vars)
* `frontend/README.md` (frontend env vars + runtime behavior)

---

## Quick links

* Frontend docs: `frontend/README.md`
* Backend docs: `backend/README.md`
* Benchmarks: `k6/benchmarks/README.md`

---

*Last updated: 2026-01-14*