// Seeded by server/prisma/seed.ts (admin.email/password come from
// ADMIN_EMAIL/ADMIN_PASSWORD in server/.env.test) and
// server/prisma/seed-e2e.ts (agent), both run in e2e/global-setup.ts.
export const ADMIN = {
  email: process.env.ADMIN_EMAIL!,
  password: process.env.ADMIN_PASSWORD!,
}

// Must stay in sync with server/prisma/e2e-agent-fixture.ts — duplicated
// here (rather than imported) because the e2e workspace deliberately
// doesn't depend on the server workspace's module system/build setup.
export const AGENT = {
  email: 'agent.e2e@example.com',
  password: 'agent-e2e-password-123',
}
