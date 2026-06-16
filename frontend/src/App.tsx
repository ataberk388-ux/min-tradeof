import { AuthForm } from '@/components/AuthForm'
import { Terminal } from '@/components/trade/Terminal'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { isAuthenticated } = useAuth()
  // Token yoksa giris ekrani; varsa terminal (genis ekran: panel duzeni, dar ekran: mobil).
  return isAuthenticated ? <Terminal /> : <AuthForm />
}

export default App
