# HelpDesk — Claude Code Guide

## Project

AI-powered ticket management system. Support emails arrive via webhook, get auto-classified and summarized by Claude AI, and agents can review and reply from a dashboard. Replies are sent back to students via email.

## Tech Stack

| Layer | Choice |
|---|---|
| AI | Anthropic Claude API |
| Email | SendGrid or Mailgun (inbound webhook + outbound replies) |
| Validation | Zod (all payloads, forms, env) |
| Deployment | Docker + cloud provider |

(Runtime/backend/frontend/styling/routing/database/auth choices are in `client/package.json` and `server/package.json`.)

## Dev Commands

`bun dev` / `dev:server` / `dev:client` — see root `package.json` scripts.

Server hot-reloads via `bun --watch`. Vite handles client HMR. The Vite proxy forwards all `/api/*` requests to `:3000`, so no CORS issues in dev.

## Frontend Data Fetching

Use `axios` for HTTP calls and TanStack Query (`@tanstack/react-query`) for server state — don't reach for raw `fetch` or manual `useEffect`/`useState` data loading in new pages/components.

- Shared `QueryClient` lives in `client/src/lib/query-client.ts`; `client/src/main.tsx` wraps the app in `QueryClientProvider`.
- Pass `{ withCredentials: true }` on axios calls so the Better Auth session cookie is sent.
- See `client/src/pages/UsersPage.tsx` for the reference pattern (`useQuery({ queryKey, queryFn })`).

## Data Validation

Use **Zod** for all data validation — API request/response payloads, form input, webhook bodies, and env vars. Don't hand-roll `if (!body.email)` checks or use another validation library.

- **Version** — Zod v4 (`zod@^4`). Some v3 idioms moved to top-level: `z.email()`, `z.uuid()`, `z.url()` instead of `z.string().email()` etc. Check Context7 before writing schemas.
- **Forms** — `react-hook-form` + `@hookform/resolvers/zod`: define the schema, pass `resolver: zodResolver(schema)`, and derive the form type with `z.infer<typeof schema>`. See `client/src/components/CreateUserDialog.tsx` and `client/src/pages/LoginPage.tsx` for the reference pattern.
- **Server routes** — parse `req.body` / `req.query` with a schema at the top of each handler and return `400` with the flattened issues on failure, via the top-level `z.flattenError(result.error)` (`res.status(400).json({ error: z.flattenError(result.error) })`) — **not** the instance method `result.error.flatten()`, which is deprecated in Zod v4. Express v5 propagates async throws automatically, so a thrown `ZodError` can also be handled centrally in an error middleware.
- **Shared shapes live in `core`** — any schema needed on both sides (e.g. the create-user payload) is defined once in the `core` workspace package (`core/src/*.ts`, re-exported from `core/src/index.ts`) and imported as `from 'core'` — never duplicated between `client` and `server`. `core` has no build step; both Vite and Bun consume its `.ts` source directly via the workspace symlink (`"core": "workspace:*"` in each package's `package.json`). See `core/src/user.ts` (`createUserSchema`), consumed by `client/src/components/CreateUserDialog.tsx` (form validation via `zodResolver`) and `server/src/routes/users.ts` (`.safeParse(req.body)`), for the reference pattern. A schema used on only one side stays local to that workspace instead of moving to `core`.

## Domain Model (planned)

- **User** — role: `admin | agent`, email + hashed password
- **Ticket** — status: `open | resolved | closed`, category: `general | technical | refund`, sender email/name, subject, body
- **Message** — belongs to Ticket, has author (agent or null for inbound), body, timestamp
- **Category** — seeded: General Questions, Technical Questions, Refund Requests

## Authentication

Better Auth (`server/src/lib/auth.ts`), email/password only, `disableSignUp: true` — accounts are created via the seed script (`server/prisma/seed.ts`), not self-registration. Sessions are stored in Postgres through `prismaAdapter`, not JWTs.

- **Role field** — `user.role` is a Better Auth `additionalFields` entry (`admin | agent`), defaults to `agent`, not settable via client input (`input: false`).
- **Admin-only routes** — `client/src/components/AdminRoute.tsx` additionally gates on `session.user.role === 'admin'` (redirects to `/` otherwise). Nest it inside `ProtectedRoute` in `App.tsx`, e.g. the `/users` route.
- **Env vars** (`server/.env.example`) — `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `TRUSTED_ORIGIN` (must match the Vite dev origin, `http://localhost:5173`), plus `ADMIN_EMAIL` / `ADMIN_PASSWORD` consumed by the seed script.

## Testing

E2E tests live in `e2e/tests/*.spec.ts` (Playwright), fully isolated from the dev database.

- **Config & DB isolation** — see `.claude/agents/e2e-test-writer.md` for the Playwright config and test-DB isolation details.
- **Writing tests** — use the `e2e-test-writer` subagent (`.claude/agents/e2e-test-writer.md`) rather than writing specs by hand. It reads the actual route/component before writing locators, respects `ProtectedRoute`/`AdminRoute` redirects, and runs the suite before handing back. Invoke it proactively after adding or changing a page, route, or user-facing flow, or when asked for E2E coverage.

### Component tests

Client-side component tests use Vitest + React Testing Library, colocated with the component as `*.test.tsx` (e.g. `client/src/pages/UsersPage.test.tsx`).

- **Run** — `bun run --cwd client test` (or root shortcut `bun run test:client`) runs once; `bun run --cwd client test:watch` for watch mode.
- **Config** — `client/vite.config.ts` has the `test` block (`environment: 'happy-dom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`). Environment is **happy-dom, not jsdom** — jsdom 30's bundled `undici` calls a `node:worker_threads` API Bun's runtime doesn't implement, which crashes the test worker on startup. Don't reintroduce jsdom.
- **Setup file** — `client/src/test/setup.ts` imports `@testing-library/jest-dom/vitest` (the vitest-specific subpath — it augments Vitest's `Assertion` type; the default `@testing-library/jest-dom` entrypoint only augments Jest's types and `toBeInTheDocument()`-style matchers won't typecheck).
- **Query rendering** — use the shared `renderWithQuery(ui, options?)` helper from `client/src/test/render-with-query.tsx` for any component that calls `useQuery`/`useMutation`. It wraps the component in a fresh `QueryClientProvider` per render with `retry: false` (avoids retry-related test timeouts and cross-test cache bleed). Don't hand-roll a local `QueryClientProvider` wrapper per test file.
- **Mocking HTTP** — `vi.mock('axios')` at the top of the file, then `vi.mocked(axios.get)` (or `.post`/etc.) to set per-test resolved/rejected values. Reset mocks in `beforeEach`.
- **Async assertions** — prefer `screen.findByText(...)` / `waitFor(...)` over `getByText` when waiting on a query to resolve; `useQuery`'s `isPending` is only true synchronously on the very first render.
- Query by `data-slot`/`data-variant` attributes (shadcn components render these, e.g. `[data-slot="skeleton"]`, `[data-variant="secondary"]` on `Badge`) when there's no accessible text/role to target.

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

Libraries to always check via Context7:
- `Bun` — runtime APIs, workspace config, `bunfig.toml` options
- `Express` — v5 changed several APIs (async error handling, path matching)
- `Prisma` — schema syntax, migration commands, client queries
- `React` — React 19 hooks and concurrent features
- `Vite` — config options, plugin API
- `Tailwind CSS` — v4 uses `@import "tailwindcss"`, no config file needed
- `React Router` — v7 changed loader/action patterns
- `TanStack Query` — v5 changed several APIs (`isPending` vs `isLoading`, object-form `useQuery`)
- `Vitest` / `React Testing Library` — config shape, matcher/type entrypoints, environment options
- `Anthropic SDK` — messages API, tool use, streaming
- `Better Auth` — adapter config, plugin API, session/cookie handling
- `Zod` — v4 moved several APIs to top-level (`z.email()`, `z.uuid()`) and changed error formatting

## Key Decisions & Gotchas

- **Bun workspaces** hoist packages to root `node_modules/.bun/` but symlink them into each workspace's `node_modules/` — IDE resolution works, `bun tsc` is the source of truth
- **`core` workspace package** — holds Zod schemas shared between `client` and `server` (see [Shared shapes](#data-validation)). Depended on via `"core": "workspace:*"`; new shared schemas go in `core/src/`, re-exported from `core/src/index.ts`
- **Tailwind v4** — no `tailwind.config.js`; configured via CSS and the `@tailwindcss/vite` plugin
- **Express v5** — async route errors propagate automatically (no need to `next(err)` manually)
- **Session auth** — Better Auth cookie-based sessions stored in PostgreSQL via `prismaAdapter`; no JWT, no `connect-pg-simple`
- **No self-registration** — `disableSignUp: true` in `auth.ts`; new users only via `server/prisma/seed.ts`
- Copy `.env.example` → `.env` in `server/` before running
- **Zod v4, not v3** — `z.email()` is top-level; `z.string().email()` is deprecated. Same for error formatting: use the top-level `z.flattenError(error)` / `z.treeifyError(error)`, not the deprecated `error.flatten()` / `error.format()` instance methods
- **Vitest DOM environment must be `happy-dom`, not `jsdom`** — see [Component tests](#component-tests) above
