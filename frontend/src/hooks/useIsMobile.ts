import { useEffect, useState } from 'react'

/** Ekran dar mi (telefon)? Pencere boyutu degisince guncellenir. */
export function useIsMobile(query = '(max-width: 767px)'): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mql.addEventListener('change', handler)
    setMobile(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return mobile
}
