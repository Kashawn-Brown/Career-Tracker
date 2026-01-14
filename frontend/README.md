# Career-Tracker — Frontend (Next.js)

The frontend is a **Next.js App Router** web app focused on a fast, table-first Applications UX, with a **right-side details drawer** for safe viewing/editing.

This README documents the *current* UI architecture and the key client-side conventions that keep the app stable (draft-based edits, edit-gated destructive actions, FormData-safe API calls, etc.).

---

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui + Radix primitives (Sheet/Dialog/Input/Button/Card/etc.)
- JWT auth stored in `localStorage` (rehydrated on refresh)

---

## Route structure (App Router)

- Public routes live under:
  - `src/app/(public)/login/page.tsx`
  - `src/app/(public)/register/page.tsx`

- Protected app routes live under:
  - `src/app/(app)/applications/page.tsx`
  - `src/app/(app)/profile/page.tsx`

Protection is enforced in:
- `src/app/(app)/layout.tsx` — wraps app routes with:
  - `src/components/auth/RequireAuth.tsx`
  - `src/components/layout/AppShell.tsx`

Global providers:
- `src/app/providers.tsx` — wraps the app with `AuthProvider`

---

## Auth model (refresh-safe)

Core files:
- `src/contexts/AuthContext.tsx` — source of truth for `{ user, token, login, register, logout, isHydrated }`
- `src/hooks/useAuth.ts` — convenience hook to access auth context
- `src/lib/auth/token.ts` — `getToken/setToken/clearToken` (localStorage)

Behavior:
- Token is stored in localStorage on login/register.
- On app load, auth rehydrates by calling the backend `me` endpoint.
- `apiFetch` supports a global 401 handler via `setUnauthorizedHandler(...)` so the auth layer can logout consistently.

---

## Core UX architecture (table + drawer)

### Applications page (table-first)
Primary page:
- `src/app/(app)/applications/page.tsx`

Key components:
- `src/components/applications/ApplicationsTable.tsx` — table rendering + row select
- `src/components/applications/ApplicationDetailsDrawer.tsx` — right-side Sheet for viewing/editing
- `src/components/applications/ColumnsControl.tsx` — show/hide columns + persistence
- `src/components/applications/CreateApplicationForm.tsx` — create flow (including favorite support)

Table helpers live in:
- `src/lib/applications/tableColumns.ts` — column definitions + localStorage key(s)
- `src/lib/applications/presentation.ts` — labels, formatting helpers
- `src/lib/applications/dates.ts` — date parsing/formatting + “no future date” safeguards
- `src/lib/applications/tags.ts` — tags text parsing/serialization

### Drawer edit model (safety-first)
Drawer file:
- `src/components/applications/ApplicationDetailsDrawer.tsx`

Key conventions:
- **View-first by default**
- Edits require explicit **Edit mode**
- **Save/Cancel** only in edit mode
- Draft is stored as a string-friendly object and converted to a clean request payload on Save
- On record switch, draft resets safely (avoids overwriting draft while editing)

> Rule of thumb: the table stays lightweight; anything complex (documents, connections, long notes) goes in the drawer/dialogs.

---

## Documents v1 (UI)

Documents are surfaced inside the drawer and are **edit-gated** (upload/delete actions require drawer Edit mode).

Key files:
- `src/components/applications/ApplicationDocumentsSection.tsx` — list/upload/open/delete UI + errors
- `src/lib/api/documents.ts` — typed client for doc endpoints
- `src/lib/api/client.ts` — FormData-safe fetch wrapper (critical for uploads)

PDF preview:
- Preview is handled in `ApplicationDetailsDrawer.tsx` via an **iframe overlay positioned outside the Sheet**
- This keeps the drawer layout stable and avoids heavy PDF tooling
- Layering/z-index is managed in the drawer so preview doesn’t break close buttons or scrolling

---

## Connections (UI)

Connections are global entities that can be attached/detached to applications. The UX is intentionally confirm-based (no silent attach).

Key files:
- `src/components/applications/ApplicationConnectionsSection.tsx`
  - Lists attached connections
  - Detach is gated by drawer Edit mode
  - Add flow supports:
    - autocomplete → select existing → autofill/lock → explicit confirm attach
    - create new connection → create → attach
- `src/hooks/useConnectionAutocomplete.ts`
  - debounced search for suggestions while typing
- `src/lib/api/connections.ts` and `src/lib/api/applications.ts`
  - typed client calls for connection CRUD and app attach/detach

Profile management:
- `src/app/(app)/profile/page.tsx` orchestrates state + calls
- UI is modularized into cards under:
  - `src/components/profile/UserProfileCard.tsx`
  - `src/components/profile/JobSearchPreferencesCard.tsx`
  - `src/components/profile/BaseResumeCard.tsx`
  - `src/components/profile/ProfileConnectionsCard.tsx`
    - includes the 2-pane “View all connections” modal (list left, details right)

---

## API client conventions

Central fetch wrapper:
- `src/lib/api/client.ts` (`apiFetch`)
  - Adds Bearer token by default (`auth: true`)
  - Provides consistent `ApiError`
  - **FormData-safe**:
    - if body is `FormData`, it does **not** set JSON `Content-Type`
    - it does **not** stringify the body
  - Supports a global 401 handler (`setUnauthorizedHandler`)

Routes are centralized in:
- `src/lib/api/routes.ts`

Typed clients live in:
- `src/lib/api/applications.ts`
- `src/lib/api/documents.ts`
- `src/lib/api/connections.ts`
- `src/lib/api/application-documents.ts` (application ↔ documents helpers)

Query params: boolean-safe pattern
- When building query strings, we check `!== undefined` (not truthy checks), so `false` values are not dropped.

Types live in:
- `src/types/api.ts` (DTOs + request/response types)

---

## Dismissible alerts (UX consistency)

Pattern: status/error banners are dismissible via an × button that clears the message state.
You’ll see this applied across:
- Applications page
- Drawer sections (documents/connections)
- Auth pages
- Profile flows

Goal: prevent stale banners from lingering and keep UX consistent.

---

## Running locally

### Environment
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
````

### Commands

From `frontend/`:

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

From repo root (workspaces):

```bash
npm run dev:frontend
npm run build:frontend
npm run start:frontend
```

---

## Deployment notes

* Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend API base (example: `https://<api-host>/api/v1`)
* Deploy as a standard Next.js app (Vercel recommended)

---

*Last updated: 2026-01-14*
