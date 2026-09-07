import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
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

async function fetchUsers() {
  const res = await axios.get<User[]>('/api/users', { withCredentials: true })
  return res.data
}

export default function UsersPage() {
  const {
    data: users,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Users</h1>

      {isError && <p className="text-sm text-destructive">Failed to load users.</p>}

      {!isError && isPending && (
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
