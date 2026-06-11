# Tech Stack

## Frontend
- **React 19 + TypeScript** (Vite) — SPA, type-safe component development
- **Tailwind CSS** — utility-first styling
- **React Router** — client-side routing

## Backend
- **Node.js with Express and TypeScript** - keeps the entire stack in one language, simple to setup up REST APIs
- **Database sessions ** for authentication


## Database
- **PostgreSQL** — relational data model for tickets, users, and categories. Fits naturally into tables with foreign keys. Good for filtering/sorting queries.

## ORM
- **Prisma** — type-safe database migrations, works great with TypeScript


## AI
- **Claude API (Anthropic)** — ticket classification, summarization, suggested replies, and knowledge-base-grounded response generation

## Email
- **SendGrid or Mailgun** — outbound replies to students from agents/AI
- **Inbound webhooks** — incoming student emails are posted to the backend via webhook and converted into tickets

## Deployment
- **Docker** + a cloud provider (AWS, Railway, Fly.io, etc.)

## Key Trade-offs
- Separate frontend/backend gives flexibility (each can be deployed and scaled independently) at the cost of slightly more setup than a full-stack framework like Next.js
