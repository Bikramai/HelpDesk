import { execSync } from 'node:child_process'
import path from 'node:path'
import { Client } from 'pg'

const serverDir = path.resolve(import.meta.dirname, '../server')

async function ensureTestDatabaseExists(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const dbName = url.pathname.replace(/^\//, '')

  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run e2e setup against database "${dbName}" — DATABASE_URL in server/.env.test must point at a database ending in "_test" so tests never touch dev data.`,
    )
  }

  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = '/postgres'

  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (rowCount === 0) {
      // Database names can't be parameterized; safe here since we've already
      // validated dbName came from a well-formed connection URL above.
      await client.query(`CREATE DATABASE "${dbName}"`)
      console.log(`Created test database "${dbName}"`)
    }
  } finally {
    await client.end()
  }
}

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — check server/.env.test exists (copy it from server/.env.test.example)')
  }

  await ensureTestDatabaseExists(databaseUrl)

  const env = { ...process.env }
  execSync('bunx prisma migrate deploy', { cwd: serverDir, stdio: 'inherit', env })
  execSync('bun prisma/seed.ts', { cwd: serverDir, stdio: 'inherit', env })
}
