/** JWT + kullanici adinin tarayicida saklanmasi. Tek kaynak burasi. */

const TOKEN_KEY = 'cryptoalarm.token'
const USER_KEY = 'cryptoalarm.username'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername(): string | null {
  return localStorage.getItem(USER_KEY)
}

export function saveAuth(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, username)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** 401 alindiginda yayinlanir; AuthProvider dinleyip oturumu dusurur. */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'
