import { Navigate } from 'react-router-dom'
import { authClient } from '../lib/auth-client'
import Layout from './Layout'

export default function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Layout user={session.user} />
}
