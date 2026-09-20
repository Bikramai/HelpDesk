import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { hashPassword } from 'better-auth/crypto'
import { auth } from './lib/auth'
import { requireAuth } from './middleware/requireAuth'
import { requireAdmin } from './middleware/requireAdmin'
import prisma from './lib/prisma'
import { Role } from './generated/prisma/client'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))

app.all('/api/auth/{*any}', toNodeHandler(auth))

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Better Auth's own routes above are rate-limited internally (enabled by
// default in production, disabled in development). This covers everything
// else under /api — production only, same as Better Auth's default.
if (process.env.NODE_ENV === 'production') {
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )
}

app.get('/api/me', requireAuth, (_req, res) => {
  res.json(res.locals.user)
})

app.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  res.json(users)
})

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password } = req.body ?? {}

  if (typeof name !== 'string' || name.trim().length < 3) {
    res.status(400).json({ error: 'Name must be at least 3 characters' })
    return
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'Enter a valid email address' })
    return
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' })
    return
  }

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
      name: name.trim(),
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
