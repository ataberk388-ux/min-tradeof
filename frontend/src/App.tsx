import { AuthForm } from '@/components/AuthForm'
import { TradingTerminal } from '@/components/trade/TradingTerminal'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { isAuthenticated } = useAuth()
  // Token yoksa giris ekrani; varsa Binance spot trading terminali.
  return isAuthenticated ? <TradingTerminal /> : <AuthForm />
}

export default App
