# Implementation Plan — AI-Powered Ticket Management System

## Phase 1: Project Scaffold & Database

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Set up Express server with TypeScript
- [ ] Setup up React app with TypeScript
- [ ] Setup up PostgreSQL database

---

## Phase 2: Authentication

**Goal:** Agents and admin can log in/out; routes are protected.

- [ ] `POST /api/auth/login` — validate credentials, create session
- [ ] `POST /api/auth/logout` — destroy session
- [ ] `GET /api/auth/me` — return current user from session
- [ ] Session middleware using `express-session` + `connect-pg-simple`
- [ ] Auth guard middleware (reusable, role-aware)
- [ ] Frontend login page
- [ ] React auth context + protected route wrapper
- [ ] Redirect unauthenticated users to `/login`

---

## Phase 3: Ticket Ingestion (Email → Ticket)

**Goal:** Incoming student emails are converted into tickets automatically.

- [ ] Set up inbound email webhook endpoint: `POST /api/webhooks/email`
- [ ] Parse sender, subject, and body from webhook payload (SendGrid/Mailgun format)
- [ ] Create a `Ticket` record with status `open`
- [ ] Trigger AI classification immediately after creation (calls Phase 5 logic)
- [ ] Return `200 OK` to the email provider
- [ ] Manual ticket creation endpoint for testing: `POST /api/tickets`

---

## Phase 4: Ticket API (CRUD)

**Goal:** Full REST API for the ticket dashboard.

- [ ] `GET /api/tickets` — list all tickets; support filter by status, category; sort by date/status
- [ ] `GET /api/tickets/:id` — ticket detail with messages
- [ ] `PATCH /api/tickets/:id` — update status or category
- [ ] `DELETE /api/tickets/:id` — admin only
- [ ] `POST /api/tickets/:id/messages` — agent posts a reply (saves to DB and sends email)
- [ ] Input validation with `zod` on all routes

---

## Phase 5: AI Features (Claude API)

**Goal:** Claude auto-classifies tickets, summarizes them, and suggests replies.

- [ ] Add Anthropic SDK; store `ANTHROPIC_API_KEY` in `.env`
- [ ] **Classification** — on ticket creation, call Claude to assign one of the three categories; persist result
- [ ] **Summarization** — `GET /api/tickets/:id/summary` returns a 2–3 sentence summary of the ticket thread
- [ ] **Suggested reply** — `GET /api/tickets/:id/suggestion` returns a draft response grounded in the knowledge base
- [ ] Load knowledge base from a static markdown/text file; inject as system context in prompts
- [ ] Keep AI calls isolated in a `src/services/ai.ts` module

---

## Phase 6: Outbound Email

**Goal:** Agent replies are delivered to students via email.

- [ ] Integrate SendGrid or Mailgun SDK; store API key in `.env`
- [ ] `sendReply(to, subject, body)` helper in `src/services/email.ts`
- [ ] Call `sendReply` when an agent posts a message to a ticket
- [ ] Mark ticket status as `resolved` automatically after a reply is sent
- [ ] Log email send result (success / failure) to console / DB

---

## Phase 7: Frontend — Dashboard & Ticket List

**Goal:** Agents can see all tickets with filtering and sorting.

- [ ] Layout shell: sidebar nav (Dashboard, Tickets, Users) + top bar with logged-in user
- [ ] Dashboard page: counts by status (Open / Resolved / Closed)
- [ ] Ticket list page: table/card list, filter bar (status, category), sort controls
- [ ] API client using `fetch` with typed response helpers
- [ ] Loading and empty states

---

## Phase 8: Frontend — Ticket Detail

**Goal:** Agents can read, manage, and reply to a ticket.

- [ ] Ticket detail page: subject, sender, date, category badge, status badge
- [ ] Message thread display (student email + agent replies)
- [ ] "Get AI Summary" button — fetches and displays summary
- [ ] "Suggest Reply" button — pre-fills reply textarea with AI suggestion
- [ ] Reply textarea + Send button — posts message and updates status
- [ ] Status change dropdown (Open → Resolved → Closed)
- [ ] Re-classify button (admin only)

---

## Phase 9: User Management (Admin)

**Goal:** Admin can create and manage agent accounts.

- [ ] `GET /api/users` — list all users (admin only)
- [ ] `POST /api/users` — create agent account (admin only)
- [ ] `PATCH /api/users/:id` — update name / role
- [ ] `DELETE /api/users/:id` — deactivate account
- [ ] Frontend users page: table of agents with role badges
- [ ] Create-agent form (name, email, temporary password)

---

## Phase 10: Polish & Deployment

**Goal:** Production-ready, containerized, deployed.

- [ ] Error handling middleware (global catch-all, structured JSON errors)
- [ ] Environment validation on startup (fail fast if required env vars missing)
- [ ] `Dockerfile` for backend, `Dockerfile` for frontend
- [ ] `docker-compose.yml` for local full-stack dev (postgres + backend + frontend)
- [ ] Choose cloud provider (Railway / Fly.io / AWS) and deploy
- [ ] Set production env vars; run migrations against prod DB
- [ ] Smoke test: send a test email → ticket appears → AI classifies → agent replies → email delivered
