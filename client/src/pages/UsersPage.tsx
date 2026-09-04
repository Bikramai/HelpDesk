import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'agent'
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadUsers() {
      setError(null)
      const res = await fetch('/api/users', { credentials: 'include' })

      if (cancelled) return

      if (!res.ok) {
        setError('Failed to load users.')
        return
      }

      setUsers(await res.json())
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Users</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && !users && (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      )}

      {users && users.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found.</p>
      )}

      {users && users.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
