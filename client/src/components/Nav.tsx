import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth-client'

type NavProps = {
  user: {
    name: string
    email: string
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
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-gray-900">HelpDesk</span>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">{user.name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
