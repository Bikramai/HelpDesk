import { Outlet } from 'react-router-dom'
import Nav from './Nav'

type LayoutProps = {
  user: {
    name: string
    email: string
  }
}

export default function Layout({ user }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav user={user} />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
