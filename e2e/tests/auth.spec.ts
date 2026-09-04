import { test, expect } from '@playwright/test'
import { loginAs, logout } from './helpers/auth'
import { ADMIN, AGENT } from './fixtures/users'

const SESSION_COOKIE_NAME = 'better-auth.session_token'

test.describe('login form validation', () => {
  test('shows errors for an empty submission and does not navigate', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Enter a valid email address')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('shows a format error for an invalid email', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password').fill('something')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Enter a valid email address')).toBeVisible()
    await expect(page.getByText('Password is required')).not.toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('shows a required error when password is missing', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Password is required')).toBeVisible()
    await expect(page.getByText('Enter a valid email address')).not.toBeVisible()
    await expect(page).toHaveURL('/login')
  })
})

test.describe('login flow', () => {
  test('signs in with valid credentials and lands on the dashboard', async ({ page }) => {
    await loginAs(page, ADMIN)

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Admin')).toBeVisible()
  })

  test('rejects a wrong password with a generic error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Password').fill('definitely-the-wrong-password')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('rejects an unknown email with the same generic error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nobody-like-this-exists@example.com')
    await page.getByLabel('Password').fill('whatever123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('clears the server error and succeeds on retry after fixing the password', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Password').fill('wrong-first-try')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Invalid email or password')).toBeVisible()

    await page.getByLabel('Password').fill(ADMIN.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText('Invalid email or password')).not.toBeVisible()
  })
})

test.describe('session and redirects', () => {
  test('redirects an unauthenticated visitor from / to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('redirects an unauthenticated visitor from /users to /login', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL('/login')
  })

  test('redirects an authenticated user away from /login to /', async ({ page }) => {
    await loginAs(page, ADMIN)

    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })

  test('keeps the session across a page reload', async ({ page }) => {
    await loginAs(page, ADMIN)

    await page.reload()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('signing out clears the session and blocks protected routes again', async ({ page }) => {
    await loginAs(page, ADMIN)

    await logout(page)

    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('role-based access to /users', () => {
  test('an admin can open /users and sees the Users nav link', async ({ page }) => {
    await loginAs(page, ADMIN)

    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()

    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL('/users')
  })

  test('an agent is redirected from /users to / and has no Users nav link', async ({ page }) => {
    await loginAs(page, AGENT)

    await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible()

    await page.goto('/users')
    await expect(page).toHaveURL('/')
  })
})

test.describe('GET /api/me without a UI session', () => {
  test('returns 401 with a JSON error when no cookie is sent', async ({ request }) => {
    const response = await request.get('/api/me')

    expect(response.status()).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  test('returns the same 401 JSON error for a tampered/bogus session cookie', async ({ playwright }) => {
    const context = await playwright.request.newContext({
      baseURL: 'http://localhost:5173',
      extraHTTPHeaders: {
        Cookie: `${SESSION_COOKIE_NAME}=this-is-not-a-real-session-token`,
      },
    })

    const response = await context.get('/api/me')

    expect(response.status()).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })

    await context.dispose()
  })
})

test.describe('login form loading state', () => {
  test('the password input is masked', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
  })

  test('disables the submit button and shows a loading label while signing in, guarding against a double submit', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Password').fill(ADMIN.password)

    let signInRequestCount = 0
    await page.route('**/api/auth/sign-in/email', async (route) => {
      signInRequestCount++
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })

    // A plain name-based locator won't survive the label swapping from
    // "Sign in" to "Signing in…", so target the form's submit button by role
    // without a name filter (it's the only button in the form).
    const submitButton = page.locator('form').getByRole('button')
    await submitButton.click()

    await expect(submitButton).toBeDisabled()
    await expect(submitButton).toHaveText('Signing in…')

    // The button is natively disabled while submitting, so a browser click
    // during this window is a no-op — it must not fire a second request.
    await submitButton.click({ force: true })

    await expect(page).toHaveURL('/')
    expect(signInRequestCount).toBe(1)
  })
})

test.describe('email normalization on login', () => {
  test('logging in with an all-caps email still succeeds', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN.email.toUpperCase())
    await page.getByLabel('Password').fill(ADMIN.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('logging in with a whitespace-padded email still succeeds (the browser strips it from the input[type=email] value)', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(`  ${ADMIN.email}  `)
    await page.getByLabel('Password').fill(ADMIN.password)

    // input[type=email] applies the HTML value-sanitization algorithm,
    // stripping leading/trailing whitespace before it ever reaches React.
    await expect(page.getByLabel('Email')).toHaveValue(ADMIN.email)

    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})

test.describe('post-logout navigation', () => {
  test('going back after sign-out does not reveal protected content', async ({ page }) => {
    await loginAs(page, ADMIN)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // The login->dashboard and sign-out navigations both use `replace`, so
    // they don't add history entries on their own. Click a real (push) nav
    // link first so there's a protected-page entry in history to go back to.
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL('/users')

    await logout(page)

    await page.goBack()
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).not.toBeVisible()
  })
})

test.describe('cross-tab session invalidation', () => {
  test('signing out in one tab invalidates the session for another tab sharing the same context', async ({
    context,
  }) => {
    const pageA = await context.newPage()
    const pageB = await context.newPage()

    await loginAs(pageA, ADMIN)

    // pageB shares cookies with pageA via the same browser context, so it's
    // already authenticated — going straight to "/" lands on the dashboard
    // without hitting /login (which would redirect an already-signed-in user).
    await pageB.goto('/')
    await expect(pageB.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await logout(pageA)

    await pageB.reload()
    await expect(pageB).toHaveURL('/login')

    await pageA.close()
    await pageB.close()
  })
})
