import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { hashPassword } from 'better-auth/crypto'
import { z } from 'zod'
import { createUserSchema } from 'core'
import { requireAuth } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import prisma from '../lib/prisma'
import { Role } from '../generated/prisma/client'

const router = Router()

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  res.json(users)
})

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) })
    return
  }
  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'A user with that email already exists' })
    return
  }

  const userId = randomUUID()
  const now = new Date()

  const user = await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: true,
      role: Role.agent,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: 'credential',
          password: await hashPassword(password),
          createdAt: now,
          updatedAt: now,
        },
      },
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  res.status(201).json(user)
})

export default router
