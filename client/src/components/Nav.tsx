import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth-client'

type NavProps = {
  user: {
    name: string
    email: string
    role?: string
  }
}

export default function Nav({ user }: NavProps) {
  const navigate = useNavigate()

  function handleSignOut() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate('/login', { replace: true }),
      },
    })
  }

  return (
    <header className="border-b border-gray-700 bg-gray-800">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-white">HelpDesk</span>

        <div className="flex items-center gap-4">
          {user.role === 'admin' && (
            <Link
              to="/users"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Users
            </Link>
          )}
          <span className="text-sm text-gray-300">{user.name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-300 hover:text-white border border-gray-600 rounded-md px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
