# Tech Stack

## Frontend
- **React 19 + TypeScript** (Vite) — SPA, type-safe component development
- **Tailwind CSS** — utility-first styling
- **React Router v7** — client-side routing

## Backend
- **Node.js + Express + TypeScript** — REST API server
- Database sessions for authentication


## Database
- **PostgreSQL** — relational data model for tickets, users, and categories. Fits naturally into tables with foreign keys. Good for filtering/sorting queries.

## ORM
- **Prisma** — type-safe database access and migrations


## AI
- **Claude API (Anthropic)** — ticket classification, summarization, suggested replies, and knowledge-base-grounded response generation

## Email
- **SendGrid or Mailgun** — outbound replies to students from agents/AI
- **Inbound webhooks** — incoming student emails are posted to the backend via webhook and converted into tickets

## Deployment
- **Docker** + a cloud provider (AWS, Railway, Fly.io, etc.)

## Key Trade-offs
- Separate frontend/backend gives flexibility (each can be deployed and scaled independently) at the cost of slightly more setup than a full-stack framework like Next.js
