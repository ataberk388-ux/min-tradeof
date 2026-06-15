import { BINANCE_REST } from '@/lib/binance'

/**
 * Sembol bazli ondalik hassasiyeti (Binance exchangeInfo). tickSize -> fiyat basamagi,
 * stepSize -> miktar basamagi. Bir kez yuklenir, modul cache'inde tutulur; formatlayicilar
 * buradan okur (yuklenene kadar buyukluge gore sezgisel fallback).
 */
interface Decimals {
  price: number
  qty: number
}

const cache: Record<string, Decimals> = {}

/** "0.00001000" -> 5, "1.00000000" -> 0. */
function decimalsFromStep(step: string | undefined): number | null {
  if (!step) return null
  const trimmed = step.replace(/0+$/, '')
  const dot = trimmed.indexOf('.')
  return dot === -1 ? 0 : trimmed.length - dot - 1
}

interface ExchangeFilter {
  filterType: string
  tickSize?: string
  stepSize?: string
}
interface ExchangeSymbol {
  symbol: string
  quoteAsset: string
  filters: ExchangeFilter[]
}

export async function fetchExchangeInfo(): Promise<void> {
  const res = await fetch(`${BINANCE_REST}/api/v3/exchangeInfo`)
  if (!res.ok) return
  const data = (await res.json()) as { symbols: ExchangeSymbol[] }
  for (const s of data.symbols) {
    if (s.quoteAsset !== 'USDT') continue
    const tick = s.filters.find((f) => f.filterType === 'PRICE_FILTER')?.tickSize
    const step = s.filters.find((f) => f.filterType === 'LOT_SIZE')?.stepSize
    cache[s.symbol] = {
      price: decimalsFromStep(tick) ?? 2,
      qty: decimalsFromStep(step) ?? 4,
    }
  }
}

function fallbackPriceDecimals(value: number): number {
  return value >= 1000 ? 2 : value >= 1 ? 4 : 6
}

export function priceDecimals(symbol: string, sample?: number): number {
  return cache[symbol]?.price ?? (sample != null ? fallbackPriceDecimals(sample) : 2)
}

export function qtyDecimals(symbol: string): number {
  return cache[symbol]?.qty ?? 4
}

/** Sembole gore dogru ondalikla fiyat. */
export function fmtPrice(symbol: string, value: number): string {
  const d = priceDecimals(symbol, value)
  return value.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

/** Sembole gore dogru ondalikla miktar. */
export function fmtQty(symbol: string, value: number): string {
  const d = qtyDecimals(symbol)
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d })
}
