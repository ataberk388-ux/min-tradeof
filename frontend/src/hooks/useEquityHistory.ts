import { useEffect, useRef, useState } from 'react'

const KEY = 'cryptoalarm.equity'

export interface EquityPoint {
  t: number
  v: number
}

function load(): EquityPoint[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

/**
 * Toplam portfoy degerini zaman icinde ornekler (localStorage, en fazla 15sn'de bir,
 * son 300 nokta). Portfoy equity grafigi icin.
 */
export function useEquityHistory(equity: number): EquityPoint[] {
  const [history, setHistory] = useState<EquityPoint[]>(load)
  const last = useRef(0)

  useEffect(() => {
    if (!equity || equity <= 0) return
    const now = Date.now()
    if (now - last.current < 15000) return
    last.current = now
    setHistory((prev) => {
      const next = [...prev, { t: now, v: equity }].slice(-300)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [equity])

  return history
}
