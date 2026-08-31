import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Loads server/.env.test into process.env, overriding anything already set
// (e.g. from a shell export) so e2e runs always target the test database —
// never the dev database in server/.env.
dotenv.config({
  path: path.resolve(import.meta.dirname, '../server/.env.test'),
  override: true,
})

const SERVER_PORT = process.env.PORT ?? '3000'
const CLIENT_PORT = 5173

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './global-setup.ts',

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // The child processes below inherit process.env (see webServerPlugin merge
  // order: defaults -> process.env -> per-entry env), so both the server and
  // client pick up the test DATABASE_URL loaded above without extra wiring.
  webServer: [
    {
      name: 'server',
      command: 'bun run dev',
      cwd: path.resolve(import.meta.dirname, '../server'),
      url: `http://localhost:${SERVER_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
    {
      name: 'client',
      command: 'bun run dev',
      cwd: path.resolve(import.meta.dirname, '../client'),
      url: `http://localhost:${CLIENT_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
  ],
})
