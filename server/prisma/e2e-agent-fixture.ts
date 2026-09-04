// Test-only fixture credentials for the non-admin "agent" role, used by
// server/prisma/seed-e2e.ts to create the user and by e2e/tests/fixtures/users.ts
// to log in as them. Zero-dependency on purpose so the e2e workspace (which
// doesn't depend on Prisma/better-auth) can import it directly.
export const E2E_AGENT_EMAIL = 'agent.e2e@example.com'
export const E2E_AGENT_PASSWORD = 'agent-e2e-password-123'
