import { useCallback, useEffect, useState } from 'react'

const KEY = 'cryptoalarm.favorites'

/** Favori semboller (localStorage). Markets sidebar'da yildizla. */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggle = useCallback((symbol: string) => {
    setFavorites((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    )
  }, [])

  const isFavorite = useCallback((symbol: string) => favorites.includes(symbol), [favorites])

  return { favorites, toggle, isFavorite }
}
