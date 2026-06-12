import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}

function HomePage() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setError(true))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">HelpDesk</h1>
        {status && (
          <p className="text-green-600 font-medium">API status: {status}</p>
        )}
        {error && (
          <p className="text-red-500 font-medium">Could not reach the API</p>
        )}
      </div>
    </div>
  )
}

export default App
