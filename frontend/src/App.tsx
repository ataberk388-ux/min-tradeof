import { useState } from 'react'
import { AuthForm } from '@/components/AuthForm'
import { Landing } from '@/components/Landing'
import { Terminal } from '@/components/trade/Terminal'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { isAuthenticated } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  if (isAuthenticated) return <Terminal />
  // Once landing (tanitim), sonra giris/kayit.
  return showAuth ? (
    <AuthForm onBack={() => setShowAuth(false)} />
  ) : (
    <Landing onStart={() => setShowAuth(true)} />
  )
}

export default App
