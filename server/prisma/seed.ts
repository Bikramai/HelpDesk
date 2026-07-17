import "dotenv/config"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import prisma from "../src/lib/prisma"
import { Role } from "../src/generated/prisma/client"

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists, skipping.`)
    return
  }

  const userId = randomUUID()
  const now = new Date()

  await prisma.user.create({
    data: {
      id: userId,
      name: "Admin",
      email,
      emailVerified: true,
      role: Role.admin,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(password),
          createdAt: now,
          updatedAt: now,
        },
      },
    },
  })

  console.log(`Admin user created: ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
