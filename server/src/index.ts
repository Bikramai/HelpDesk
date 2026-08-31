import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth'
import { requireAuth } from './middleware/requireAuth'

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
