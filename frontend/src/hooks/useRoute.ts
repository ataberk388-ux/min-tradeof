import { useEffect, useReducer } from 'react'

export type Route = 'trade' | 'markets' | 'portfolio' | 'alarms'

const KEY = 'cryptoalarm.route'

function getInitial(): Route {
  try {
    const r = localStorage.getItem(KEY)
    return r === 'markets' || r === 'portfolio' || r === 'alarms' ? r : 'trade'
  } catch {
    return 'trade'
  }
}

// Modul-seviyesi ortak store (useTheme deseni): nav ile sayfa govdesi ayni rotayi paylasir.
let current: Route = getInitial()
const listeners = new Set<() => void>()

function apply(route: Route) {
  current = route
  try {
    localStorage.setItem(KEY, route)
  } catch {
    /* yok say */
  }
  listeners.forEach((l) => l())
}

/** Uygulama ici sayfa yonlendirme (Trade / Markets / Portfoy / Alarmlar). Paylasimli store. */
export function useRoute() {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  return { route: current, navigate: (r: Route) => apply(r) }
}

/** Bilesen disindan (orn. komut paleti) rota degistir. */
export function navigateTo(route: Route) {
  apply(route)
}
