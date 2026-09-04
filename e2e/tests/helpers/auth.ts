import { expect, type Page } from '@playwright/test'

export async function loginAs(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Password').fill(credentials.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL('/')
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click()
  await expect(page).toHaveURL('/login')
}
