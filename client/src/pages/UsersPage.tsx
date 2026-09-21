import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { CreateUserDialog } from '@/components/CreateUserDialog'
import { UsersTable, type User } from '@/components/UsersTable'

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <CreateUserDialog />
      </div>

      <UsersTable users={users} isPending={isPending} isError={isError} />
    </div>
  )
}
