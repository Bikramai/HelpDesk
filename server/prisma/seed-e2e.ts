// Seeds the non-admin "agent" user needed for e2e role-gating tests
// (e.g. verifying /users redirects a non-admin away). Run only against the
// e2e test database, after prisma/seed.ts — see e2e/global-setup.ts.
import "dotenv/config"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import prisma from "../src/lib/prisma"
import { Role } from "../src/generated/prisma/client"
import { E2E_AGENT_EMAIL, E2E_AGENT_PASSWORD } from "./e2e-agent-fixture"

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: E2E_AGENT_EMAIL } })
  if (existing) {
    console.log(`User ${E2E_AGENT_EMAIL} already exists, skipping.`)
    return
  }

  const userId = randomUUID()
  const now = new Date()

  await prisma.user.create({
    data: {
      id: userId,
      name: "Agent E2E",
      email: E2E_AGENT_EMAIL,
      emailVerified: true,
      role: Role.agent,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(E2E_AGENT_PASSWORD),
          createdAt: now,
          updatedAt: now,
        },
      },
    },
  })

  console.log(`E2E agent user created: ${E2E_AGENT_EMAIL}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
