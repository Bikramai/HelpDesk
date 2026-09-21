import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '@/test/render-with-query'
import { CreateUserDialog } from './CreateUserDialog'

vi.mock('axios')

const mockedPost = vi.mocked(axios.post)
const mockedIsAxiosError = vi.mocked(axios.isAxiosError)

async function openDialog() {
  const user = userEvent.setup()
  renderWithQuery(<CreateUserDialog />)
  await user.click(screen.getByRole('button', { name: 'New user' }))
  await screen.findByRole('dialog')
  return user
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values: { name: string; email: string; password: string }
) {
  await user.type(screen.getByLabelText('Name'), values.name)
  await user.type(screen.getByLabelText('Email'), values.email)
  await user.type(screen.getByLabelText('Password'), values.password)
}

beforeEach(() => {
  mockedPost.mockReset()
  mockedIsAxiosError.mockReset()
})

describe('CreateUserDialog', () => {
  it('shows validation errors and does not submit when fields are invalid', async () => {
    const user = await openDialog()

    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('submits the form with the entered values and closes the dialog on success', async () => {
    mockedPost.mockResolvedValue({ data: {} })
    const user = await openDialog()

    await fillForm(user, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'supersecret',
    })
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith(
        '/api/users',
        { name: 'Ada Lovelace', email: 'ada@example.com', password: 'supersecret' },
        { withCredentials: true }
      )
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows the server error message and keeps the dialog open when creation fails', async () => {
    mockedIsAxiosError.mockReturnValue(true)
    mockedPost.mockRejectedValue({
      response: { data: { error: 'A user with that email already exists' } },
    })
    const user = await openDialog()

    await fillForm(user, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'supersecret',
    })
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(
      await screen.findByText('A user with that email already exists')
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('falls back to a generic error message for non-axios failures', async () => {
    mockedIsAxiosError.mockReturnValue(false)
    mockedPost.mockRejectedValue(new Error('boom'))
    const user = await openDialog()

    await fillForm(user, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'supersecret',
    })
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('Failed to create user')).toBeInTheDocument()
  })
})
