import { screen, waitFor, within } from '@testing-library/react'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '@/test/render-with-query'
import UsersPage from './UsersPage'

vi.mock('axios')

const mockedGet = vi.mocked(axios.get)

const users = [
  {
    id: '1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'admin' as const,
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role: 'agent' as const,
    createdAt: '2024-03-02T00:00:00.000Z',
  },
]

beforeEach(() => {
  mockedGet.mockReset()
})

describe('UsersPage', () => {
  it('shows skeleton rows while the request is pending', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    renderWithQuery(<UsersPage />)

    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('No users found.')).not.toBeInTheDocument()
    expect(screen.queryByText('Failed to load users.')).not.toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    mockedGet.mockRejectedValue(new Error('network error'))

    renderWithQuery(<UsersPage />)

    expect(await screen.findByText('Failed to load users.')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0)
  })

  it('shows an empty state when there are no users', async () => {
    mockedGet.mockResolvedValue({ data: [] })

    renderWithQuery(<UsersPage />)

    expect(await screen.findByText('No users found.')).toBeInTheDocument()
  })

  it('renders a row per user with name, email, role badge, and joined date', async () => {
    mockedGet.mockResolvedValue({ data: users })

    renderWithQuery(<UsersPage />)

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    // header row + one row per user
    expect(rows).toHaveLength(users.length + 1)

    const adaRow = screen.getByText('Ada Lovelace').closest('tr') as HTMLElement
    expect(within(adaRow).getByText('ada@example.com')).toBeInTheDocument()
    expect(within(adaRow).getByText('admin')).toHaveAttribute('data-variant', 'default')
    expect(
      within(adaRow).getByText(new Date(users[0].createdAt).toLocaleDateString())
    ).toBeInTheDocument()

    const graceRow = screen.getByText('Grace Hopper').closest('tr') as HTMLElement
    expect(within(graceRow).getByText('grace@example.com')).toBeInTheDocument()
    expect(within(graceRow).getByText('agent')).toHaveAttribute('data-variant', 'secondary')
  })

  it('calls the users endpoint with credentials included', async () => {
    mockedGet.mockResolvedValue({ data: users })

    renderWithQuery(<UsersPage />)

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith('/api/users', { withCredentials: true })
    )
  })
})
