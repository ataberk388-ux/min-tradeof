import { useEffect, useReducer } from 'react'
import type { OrderSide } from '@/lib/paper'

/**
 * Kosullu (tetikli) emirler — Stop-Limit ve OCO. Binance bunlari sunucuda tutar; biz
 * paper-trade backend'ine dokunmadan client tarafinda yonetiriz: fiyat tetik seviyesini
 * gecince koşullu emir gercek bir LIMIT emrine donusur (mevcut paper akisi).
 *
 * STOP_LIMIT: stop seviyesine gelince limitPrice'tan LIMIT emir acilir.
 * OCO: take-profit (tpPrice) VEYA stop-loss (stopPrice) — hangisi once tetiklenirse o
 * leg LIMIT olarak acilir, digeri iptal olur (One-Cancels-the-Other).
 */
export type ConditionalKind = 'STOP_LIMIT' | 'OCO'

export interface ConditionalOrder {
  id: string
  symbol: string
  side: OrderSide
  kind: ConditionalKind
  qty: number
  /** STOP_LIMIT/OCO stop tetik seviyesi. */
  stopPrice: number
  /** Tetiklenince acilacak LIMIT fiyati (OCO stop leg dahil). */
  limitPrice: number
  /** OCO take-profit limit fiyati. */
  tpPrice?: number
  createdAt: number
}

const KEY = 'cryptoalarm.conditional'

function load(): ConditionalOrder[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

// Paylasimli store: form (ekle), liste (goster) ve watcher (tetikle) ayni veriyi gorur.
let store: ConditionalOrder[] = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* yok say */
  }
  listeners.forEach((l) => l())
}

export function addConditional(o: Omit<ConditionalOrder, 'id' | 'createdAt'>) {
  store = [...store, { ...o, id: crypto.randomUUID(), createdAt: Date.now() }]
  persist()
}

export function removeConditional(id: string) {
  store = store.filter((o) => o.id !== id)
  persist()
}

export function getConditionals(): ConditionalOrder[] {
  return store
}

/** Paylasimli koşullu emir listesi. */
export function useConditionalOrders() {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  return { orders: store, add: addConditional, remove: removeConditional }
}
