# Career-Tracker — Frontend (Next.js)

The Career-Tracker frontend is a **Next.js App Router** web app that connects to the existing Fastify backend API.
It includes authentication, protected routes, an Applications dashboard, and a Profile page with Base Resume metadata (MVP: URL/metadata only).

## Tech stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui primitives (Button/Input/Card/Label + small custom Select/Alert)
- JWT auth (MVP) stored in `localStorage`

## Features (MVP)
- Auth: Register / Login / Logout
- Refresh-safe auth: rehydrates user via `GET /users/me`
- Protected routes: `(public)` vs `(app)` route groups
- Applications: list + create + update status + delete + basic search/filter/sort/reset
- Profile: view/edit name + Base Resume metadata CRUD (safe edit mode)

---

## Getting started (local dev)

### Prereqs
- Node.js 18+ recommended
- Backend running locally (default API base: `http://localhost:3002/api/v1`)

### 1) Install deps (from repo root)
```bash
npm install
````

### 2) Configure environment variables

Create `frontend/.env.local` (or copy from `frontend/.env.example`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
```

> Note: `NEXT_PUBLIC_*` variables are exposed to the browser (required for frontend → backend calls).

### 3) Run frontend

From repo root (recommended):

```bash
npm run dev:frontend
```

Or from inside `frontend/`:

```bash
npm run dev
```

The app runs at:

* [http://localhost:3000](http://localhost:3000)

---

## Running with the backend

From repo root, you can run both services together:

```bash
npm run dev
```

If you see CORS issues, make sure the backend allows the frontend origin:

* `CORS_ORIGIN=http://localhost:3000` (see `backend/.env.example`)

---

## Project structure (important bits)

### Routing

* `src/app/(public)/login` and `src/app/(public)/register`
* `src/app/(app)/applications` and `src/app/(app)/profile`
* `(app)/layout.tsx` wraps protected routes with `RequireAuth` + `AppShell/Header`

### API layer

* `src/lib/api/client.ts` — typed `apiFetch` wrapper (adds Bearer token + consistent `ApiError`)
* `src/lib/api/routes.ts` — endpoint builders (avoid hardcoding paths)
* `src/lib/api/applications.ts` / `src/lib/api/documents.ts` — feature API helpers

### Auth

* `src/contexts/AuthContext.tsx` — login/register/logout + rehydration
* `src/lib/auth/token.ts` — token helpers (localStorage)
* `apiFetch` has a global 401 handler to auto-logout and redirect cleanly

---

## Scripts

From `frontend/`:

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run production server
npm run lint    # eslint
```

From repo root:

```bash
npm run dev:frontend
npm run build:frontend
npm run start:frontend
```

---

## Deployment notes

* Set `NEXT_PUBLIC_API_BASE_URL` to your deployed backend base URL (example: `https://<api-host>/api/v1`)
* Then build/deploy as a standard Next.js app (Vercel recommended)


---
_Last updated: 2025-12-23_