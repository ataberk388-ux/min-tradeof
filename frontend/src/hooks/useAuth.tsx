import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { clearAuth, getToken, getUsername, saveAuth, UNAUTHORIZED_EVENT } from '@/lib/auth'

interface AuthContextValue {
  token: string | null
  username: string | null
  isAuthenticated: boolean
  setAuth: (token: string, username: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** JWT'nin suresi dolmus mu? (payload.exp, saniye). Cozulemezse dolmus say. */
function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

/** Saklanan token gecerli (ve suresi dolmamis) ise dondurur; degilse temizler. */
function initialToken(): string | null {
  const t = getToken()
  if (t && !isExpired(t)) return t
  clearAuth()
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(initialToken)
  const [username, setUsername] = useState<string | null>(getUsername)

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUsername(null)
    queryClient.clear() // bir sonraki kullanici eski alarmlari gormesin
  }, [queryClient])

  // 401 -> token gecersiz; api interceptor bu olayi yayinlar, biz oturumu dusururuz.
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener(UNAUTHORIZED_EVENT, handler)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler)
  }, [logout])

  const setAuth = useCallback((newToken: string, newUsername: string) => {
    saveAuth(newToken, newUsername)
    setToken(newToken)
    setUsername(newUsername)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ token, username, isAuthenticated: Boolean(token), setAuth, logout }),
    [token, username, setAuth, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth, AuthProvider icinde kullanilmali')
  }
  return ctx
}
