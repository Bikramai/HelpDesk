# HelpDesk — Claude Code Guide

## Project

AI-powered ticket management system. Support emails arrive via webhook, get auto-classified and summarized by Claude AI, and agents can review and reply from a dashboard. Replies are sent back to students via email.

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| Backend | Express 5 + TypeScript |
| Frontend | React 19 + Vite 6 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Database | PostgreSQL + Prisma ORM |
| Auth | Better Auth (email/password, database sessions via Prisma) |
| AI | Anthropic Claude API |
| Email | SendGrid or Mailgun (inbound webhook + outbound replies) |
| Deployment | Docker + cloud provider |

## Monorepo Structure

```
HelpDesk/
├── CLAUDE.md
├── package.json          # bun workspace root
├── tsconfig.json         # shared TS base (extended by server + client)
├── bunfig.toml           # backend = "symlink" for IDE package resolution
├── server/               # Express API
│   ├── src/index.ts      # entry point, Express app
│   └── .env.example
└── client/               # Vite + React SPA
    ├── src/main.tsx      # entry — BrowserRouter wraps App
    ├── src/App.tsx
    ├── src/index.css     # @import "tailwindcss"
    └── vite.config.ts    # proxies /api/* → localhost:3000
```

## Dev Commands

```bash
bun dev               # start both server + client in parallel
bun dev:server        # server only  (http://localhost:3000)
bun dev:client        # client only  (http://localhost:5173)
```

Server hot-reloads via `bun --watch`. Vite handles client HMR. The Vite proxy forwards all `/api/*` requests to `:3000`, so no CORS issues in dev.

## Domain Model (planned)

- **User** — role: `admin | agent`, email + hashed password
- **Ticket** — status: `open | resolved | closed`, category: `general | technical | refund`, sender email/name, subject, body
- **Message** — belongs to Ticket, has author (agent or null for inbound), body, timestamp
- **Category** — seeded: General Questions, Technical Questions, Refund Requests

## Authentication

Better Auth (`server/src/lib/auth.ts`), email/password only, `disableSignUp: true` — accounts are created via the seed script (`server/prisma/seed.ts`), not self-registration. Sessions are stored in Postgres through `prismaAdapter`, not JWTs.

- **Server mount** — `app.all('/api/auth/{*any}', toNodeHandler(auth))` in `server/src/index.ts` handles all Better Auth routes (sign-in, sign-out, session, etc.) under `/api/auth/*`.
- **Protecting API routes** — `server/src/middleware/requireAuth.ts` calls `auth.api.getSession()`, 401s if absent, and sets `res.locals.user` / `res.locals.session` for downstream handlers.
- **Role field** — `user.role` is a Better Auth `additionalFields` entry (`admin | agent`), defaults to `agent`, not settable via client input (`input: false`).
- **Client** — `client/src/lib/auth-client.ts` creates the Better Auth React client (`createAuthClient`) pointed at `window.location.origin`; use `authClient.useSession()` for session state and `authClient.signIn.email()` / `.signOut()` for actions.
- **Protected routes** — `client/src/components/ProtectedRoute.tsx` reads `useSession()`, redirects to `/login` when there's no session, otherwise renders `Layout` with `user={session.user}`.
- **Admin-only routes** — `client/src/components/AdminRoute.tsx` additionally gates on `session.user.role === 'admin'` (redirects to `/` otherwise). Nest it inside `ProtectedRoute` in `App.tsx`, e.g. the `/users` route.
- **Env vars** (`server/.env.example`) — `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `TRUSTED_ORIGIN` (must match the Vite dev origin, `http://localhost:5173`), plus `ADMIN_EMAIL` / `ADMIN_PASSWORD` consumed by the seed script.

## Implementation Phases

See `implementation-plan.md` for the full checklist. High-level:

1. ✅ Project scaffold & monorepo (Bun workspaces, Express, Vite, Tailwind)
2. 🔄 Auth — Better Auth wired up (email/password, login/logout, protected routes); admin-only user management still pending (phase 9)
3. Email ingestion — inbound webhook → Ticket record
4. Ticket API — CRUD, filtering, sorting, Zod validation
5. AI features — classification, summarization, suggested reply (Claude API)
6. Outbound email — SendGrid/Mailgun reply on agent response
7. Frontend dashboard & ticket list
8. Frontend ticket detail (thread, AI buttons, reply)
9. User management (admin only)
10. Polish & Docker deployment

## Fetching Up-to-Date Documentation

**Always use Context7 before writing code for any library.** This project uses several fast-moving libraries where your training data may be stale.

```
# Step 1 — resolve the library ID
mcp__context7__resolve-library-id  libraryName="Express"

# Step 2 — query docs
mcp__context7__query-docs  libraryId="/expressjs/express"  query="your question"
```

Libraries to always check via Context7:
- `Bun` — runtime APIs, workspace config, `bunfig.toml` options
- `Express` — v5 changed several APIs (async error handling, path matching)
- `Prisma` — schema syntax, migration commands, client queries
- `React` — React 19 hooks and concurrent features
- `Vite` — config options, plugin API
- `Tailwind CSS` — v4 uses `@import "tailwindcss"`, no config file needed
- `React Router` — v7 changed loader/action patterns
- `Anthropic SDK` — messages API, tool use, streaming
- `Better Auth` — adapter config, plugin API, session/cookie handling

## Key Decisions & Gotchas

- **Bun workspaces** hoist packages to root `node_modules/.bun/` but symlink them into each workspace's `node_modules/` — IDE resolution works, `bun tsc` is the source of truth
- **Tailwind v4** — no `tailwind.config.js`; configured via CSS and the `@tailwindcss/vite` plugin
- **Express v5** — async route errors propagate automatically (no need to `next(err)` manually)
- **Session auth** — Better Auth cookie-based sessions stored in PostgreSQL via `prismaAdapter`; no JWT, no `connect-pg-simple`
- **No self-registration** — `disableSignUp: true` in `auth.ts`; new users only via `server/prisma/seed.ts`
- Copy `.env.example` → `.env` in `server/` before running
