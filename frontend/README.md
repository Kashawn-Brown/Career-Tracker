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
```

---

## Environment variables

Create `frontend/.env.local`:

```env
# Local dev (backend running on localhost)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
```

Production:

- `NEXT_PUBLIC_API_BASE_URL` should point to the Cloud Run backend:
  - `https://<cloud-run-service>/api/v1`

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

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3002](http://localhost:3002) (API base: `/api/v1`)

---

## Routes (overview)

### Public routes

- `/` — marketing/home landing page
- `/about` — about the project, built-by, support, contact form
- `/docs` — feature documentation and guides
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/oauth/callback` — OAuth redirect landing (exchanges code/state with backend callback flow)

### Authenticated app

- `/applications` — main table + drawer (AI tools, documents, connections, notes per application)
- `/tools` — standalone AI tools (generic interview prep, resume advice, cover letter; results saved per user)
- `/activity` — personal usage summary: AI runs by tool, recent activity, artifact counts
- `/profile` — profile + settings + connections management + base resume / cover letter upload
- `/admin/users` — admin user management with inline credit request handling and AI usage summary
- `/admin/analytics` — admin analytics overview; per-user drilldown at `/admin/users/[userId]/analytics`

> Actual access control is enforced by backend middleware; frontend routes reflect UI surfaces.

---

## Auth flow notes (frontend perspective)

### Password auth

- Register/login returns an access token used for authenticated requests.
- Some actions require verified email; unverified users are redirected to the verify flow.

### Refresh cookie + CSRF

- On app boot (or before refresh/logout), the frontend calls `GET /auth/csrf`
- Refresh requires: refresh cookie + `X-CSRF-Token` header

This protects refresh/logout from cross-site request forgery.

### Google OAuth (PKCE)

High level:

1. User clicks "Continue with Google"
2. Browser navigates to backend: `GET /auth/oauth/google/start`
3. Google redirects back through backend callback: `GET /auth/oauth/google/callback`
4. Frontend receives the final result on: `/oauth/callback` (handles post-login navigation)

---

## API usage (basic)

All API calls use:

- Base: `NEXT_PUBLIC_API_BASE_URL`
- Auth header: `Authorization: Bearer <accessToken>`
- Cookie-aware requests for refresh/logout flows

---

## Notes on AI gating (frontend)

AI tool surfaces are governed by a monthly credit system:

- `CreditCostNote` shows "Uses X credits" on tool cards for REGULAR users (PRO sees nothing)
- `BlockedRunButton` replaces the run button when the user is out of credits, links to `/profile`
- Drawer tools show a single section-level warning banner at WARNING_90 and a blocked banner at 100% — individual cards collapse their form content when blocked
- `ProfileProAccessCard` shows real-time usage, a progress bar with threshold colouring, and a "Request more credits" button at 90%+ — `requestDone` is persisted in localStorage and clears on cycle reset
- The Activity page shows a `UsageCard` with progress bar, threshold colouring, and reset date
- Usage state is re-fetched after every successful AI run so blocked state and warnings update without a page refresh
- All credit request flows go through `ProfileProAccessCard` — `ProAccessBanner` and `RequestProDialog` have been removed

---

## Analytics surfaces

### Admin (`/admin/analytics`)
Overview summary cards (users, applications, AI runs, artifacts), AI usage breakdown by tool/scope/plan/status, top users by run count, recent failures table, and recent activity feed. Per-user drilldown at `/admin/users/[userId]/analytics` showing run history, tool breakdown, and product events. Window filter: Today / 7 days / 30 days / 1 year / All time.

### User (`/activity`)
Personal summary: applications tracked, AI runs completed, targeted and generic artifact counts. Per-tool usage bar chart. Recent runs table and recent product actions feed. Same window filter options as admin.

---

## AI tools (drawer + Tools page)

### Per-application drawer tools (require JD on the application)

- **Compatibility Check** — fit score, strengths, gaps, role signals, prep areas. Uses full career history (base resume) for best results — the AI determines what's relevant to the role.
- **Interview Prep** — focus topics with priority chips, question bank (background/technical/behavioural/situational/motivational/challenge), questions to ask; resume optional — degrades to JD-only
- **Resume Advice** — what's working, areas to improve, role alignment, rewrite suggestions, keyword coverage (split into already-covered and worth-adding chips). Best run on the full base resume — the output is the tailoring guide.
- **Cover Letter** — tailored draft with evidence, notes, and placeholder list

All drawer tools run in the background via `useDocumentToolRuns` / `useFitRuns` and survive drawer close. A notification appears on completion. Tools can optionally be run automatically after application creation.

### Generic Tools page tools (no JD required)

- **Interview Prep** — self-defense prep from resume + targeting context; results saved as `UserAiArtifact`
- **Resume Advice** — general resume improvement for target field/roles
- **Cover Letter** — reusable draft for a target direction

Generic tool results are capped at 3 per user per kind (oldest evicted). Uploaded resume files are cleaned up when a result is deleted or evicted.

---

## Base resume

The base resume is intended to be a **complete career document** — every role, skill, project, certification, and accomplishment — not a tailored application resume. The AI reads the full history and determines what's relevant for each specific role or tool run. See `/docs` for more detail.

---

*Last updated: 2026-04-12*