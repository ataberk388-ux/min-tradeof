import { useEffect, useReducer } from 'react'

type Theme = 'dark' | 'light'
const KEY = 'cryptoalarm.theme'

function getInitial(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// Modul-seviyesi ortak store: tum useTheme tuketicileri ayni temayi paylasir
let current: Theme = getInitial()
const listeners = new Set<() => void>()

function apply(theme: Theme) {
  current = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* yok say */
  }
  listeners.forEach((l) => l())
}

// Acilista mevcut temayi uygula (html sinifini ayarla)
apply(current)

/** Acik/koyu tema. Paylasimli; bir yerden degisince her yer guncellenir. */
export function useTheme() {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  return {
    theme: current,
    toggle: () => apply(current === 'dark' ? 'light' : 'dark'),
  }
}
