import { useEffect, useReducer } from 'react'

const KEY = 'cryptoalarm.accent'
const DEFAULT = '252 213 53' // altin

/** Secilebilir accent renkler (isim, RGB kanal). */
export const ACCENTS: { name: string; rgb: string }[] = [
  { name: 'Altın', rgb: '252 213 53' },
  { name: 'Mavi', rgb: '74 169 255' },
  { name: 'Yeşil', rgb: '14 203 129' },
  { name: 'Mor', rgb: '155 135 245' },
  { name: 'Turuncu', rgb: '247 147 26' },
]

let current = (() => {
  try {
    return localStorage.getItem(KEY) || DEFAULT
  } catch {
    return DEFAULT
  }
})()
const listeners = new Set<() => void>()

function apply(rgb: string) {
  current = rgb
  document.documentElement.style.setProperty('--bn-gold', rgb)
  try {
    localStorage.setItem(KEY, rgb)
  } catch {
    /* yok say */
  }
  listeners.forEach((l) => l())
}

apply(current)

/** Accent rengini paylasimli olarak yonetir (her yer ayni). */
export function useAccent() {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  return { accent: current, setAccent: apply }
}
