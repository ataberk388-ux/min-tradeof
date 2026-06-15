import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App.tsx'
import { AuthProvider } from '@/hooks/useAuth'
import './index.css'

const queryClient = new QueryClient()

// Not: StrictMode bilincli olarak kapali (canli WS akislarinda cift-mount gurultusunu onler).
// PriceProvider kaldirildi: trading terminali fiyatlari dogrudan Binance'ten alir,
// bizim /api/prices/stream'e gerek yok.
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  </QueryClientProvider>,
)
