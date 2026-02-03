# Career-Tracker — Frontend (Next.js)

Next.js App Router frontend for Career-Tracker. The UI is built around a fast **table-first Applications** experience with a **right-side details drawer** for viewing/editing, plus dedicated flows for auth, onboarding, documents, connections, and AI gating.

Live site: https://career-tracker.ca

---

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix)
- Fetch wrapper for API requests with cookie support
- Client-side auth handling (token storage) + CSRF bootstrap for refresh/logout

---

## High-level UX pattern (why the UI is shaped this way)

- **Table-first** scanning stays fast (sort, filters, paging, column control)
- **Drawer** holds details without leaving the list context
- **Explicit Edit mode** (Save/Cancel) prevents accidental changes
- Dialogs are used for focused flows (confirmations, attachments, connection attach/detach, etc.)

---

## Folder structure (high level)

```txt
frontend/
  app/                     # App Router routes (public + authenticated)
  components/              # shared UI components (table, drawer, dialogs, etc.)
  lib/                     # API client helpers, date formatting, utilities
  styles/                  # global styles (Tailwind)
  public/                  # static assets
````

---

## Environment variables

Create `frontend/.env.local`:

```env
# Local dev (backend running on localhost)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
```

Production:

* `NEXT_PUBLIC_API_BASE_URL` should point to the Cloud Run backend:

  * `https://<cloud-run-service>/api/v1`

> Note: The backend uses a refresh cookie + CSRF token for refresh/logout.
> Requests that rely on cookies must include credentials (the app does).

---

## Running locally

From repo root:

```bash
npm install
npm run dev
```

Defaults:

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend: [http://localhost:3002](http://localhost:3002) (API base: `/api/v1`)

---

## Routes (overview)

### Public routes

* `/` — marketing/home onboarding
* `/login`
* `/register`
* `/forgot-password`
* `/reset-password`
* `/verify-email`
* `/oauth/callback` — OAuth redirect landing (exchanges code/state with backend callback flow)

### Authenticated app

* `/applications` — main table + drawer
* `/profile` — profile + settings + connections management
* `/pro` — Pro request flow (if applicable)
* `/admin` — admin-only views (Pro approvals / credit operations)

> Actual access control is enforced by backend middleware; frontend routes reflect UI surfaces.

---

## Auth flow notes (frontend perspective)

### Password auth

* Register/login returns an access token used for authenticated requests.
* Some actions require verified email; unverified users are redirected to the verify flow.

### Refresh cookie + CSRF

* On app boot (or before refresh/logout), the frontend calls:

  * `GET /auth/csrf`
* Refresh requires:

  * refresh cookie + `X-CSRF-Token` header

This protects refresh/logout from cross-site request forgery.

### Google OAuth (PKCE)

High level:

1. User clicks “Continue with Google”
2. Browser navigates to backend:

   * `GET /auth/oauth/google/start`
3. Google redirects back through backend callback:

   * `GET /auth/oauth/google/callback`
4. Frontend receives the final result on:

   * `/oauth/callback` (handles post-login navigation)

---

## API usage (basic)

All API calls use:

* Base: `NEXT_PUBLIC_API_BASE_URL`
* Auth header: `Authorization: Bearer <accessToken>`
* Cookie-aware requests for refresh/logout flows

---

## Notes on AI gating (frontend)

AI actions can be blocked by:

* no free credits remaining
* user not Pro

The frontend shows gating UI (upgrade/request Pro) but the server is the enforcement point.

---

*Last updated: 2026-02-02*

