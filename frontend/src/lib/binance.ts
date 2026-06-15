/**
 * Binance public market verisi (anahtarsiz, tarayicidan dogrudan). Bizim backend'imiz
 * sadece auth + alarm + paper-trade ile ilgilenir; grafik/orderbook/trades/markets
 * dogrudan Binance'ten gelir.
 */

export const BINANCE_REST = 'https://api.binance.com'
// Port 9443 bazi aglarda/firewall'larda kapali; 443 her zaman acik (REST gibi).
export const BINANCE_WS = 'wss://stream.binance.com:443'

/**
 * WS'i gurultusuz kapatir: hala baglaniyorsa (CONNECTING) once acilmasini bekler,
 * sonra kapatir. Boylece "closed before connection established" uyarisi cikmaz
 * (React StrictMode'un cift-mount'unda ve hizli sembol degisiminde sik gorulur).
 */
export function closeWs(ws: WebSocket): void {
  if (ws.readyState === WebSocket.CONNECTING) {
    ws.addEventListener('open', () => ws.close())
  } else if (ws.readyState === WebSocket.OPEN) {
    ws.close()
  }
}

/** Grafik zaman araliklari. */
export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export type Interval = (typeof INTERVALS)[number]

export interface Ticker24h {
  symbol: string
  lastPrice: number
  priceChangePercent: number
  quoteVolume: number
  highPrice: number
  lowPrice: number
}

/** Tum semboller icin 24s istatistik. USDT ciftlerini cagiran filtreler. */
export async function fetchTickers(): Promise<Ticker24h[]> {
  const res = await fetch(`${BINANCE_REST}/api/v3/ticker/24hr`)
  if (!res.ok) throw new Error('Binance ticker alınamadı')
  const data = (await res.json()) as Record<string, string>[]
  return data.map((t) => ({
    symbol: t.symbol,
    lastPrice: Number(t.lastPrice),
    priceChangePercent: Number(t.priceChangePercent),
    quoteVolume: Number(t.quoteVolume),
    highPrice: Number(t.highPrice),
    lowPrice: Number(t.lowPrice),
  }))
}

/** Birden cok sembolun anlik fiyati (tek istek). Pozisyon PNL'i icin. */
export async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {}
  const param = encodeURIComponent(JSON.stringify(symbols))
  const res = await fetch(`${BINANCE_REST}/api/v3/ticker/price?symbols=${param}`)
  if (!res.ok) throw new Error('Binance fiyatları alınamadı')
  const data = (await res.json()) as { symbol: string; price: string }[]
  const map: Record<string, number> = {}
  for (const d of data) map[d.symbol] = Number(d.price)
  return map
}

export interface Candle {
  time: number // saniye (lightweight-charts UTCTimestamp)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function fetchKlines(
  symbol: string,
  interval: Interval,
  limit = 400,
): Promise<Candle[]> {
  const res = await fetch(
    `${BINANCE_REST}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  )
  if (!res.ok) throw new Error('Binance klines alınamadı')
  const data = (await res.json()) as unknown[][]
  return data.map((k) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }))
}

export interface DepthLevel {
  price: number
  qty: number
}
export interface DepthSnapshot {
  bids: DepthLevel[] // fiyat azalan (en iyi alis once)
  asks: DepthLevel[] // fiyat artan (en iyi satis once)
}

/** Order book: ust 20 seviye, 100ms'de bir tam snapshot. */
export function openDepthStream(
  symbol: string,
  onDepth: (d: DepthSnapshot) => void,
): WebSocket {
  const ws = new WebSocket(`${BINANCE_WS}/ws/${symbol.toLowerCase()}@depth20@100ms`)
  ws.onmessage = (event) => {
    const d = JSON.parse(event.data) as { bids: string[][]; asks: string[][] }
    const map = (arr: string[][]): DepthLevel[] =>
      arr.map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }))
    onDepth({ bids: map(d.bids), asks: map(d.asks) })
  }
  return ws
}

export interface Trade {
  id: number
  price: number
  qty: number
  time: number
  isBuyerMaker: boolean // true -> satis (kirmizi), false -> alis (yesil)
}

export function openTradeStream(symbol: string, onTrade: (t: Trade) => void): WebSocket {
  const ws = new WebSocket(`${BINANCE_WS}/ws/${symbol.toLowerCase()}@trade`)
  ws.onmessage = (event) => {
    const d = JSON.parse(event.data) as Record<string, string | number | boolean>
    onTrade({
      id: Number(d.t),
      price: Number(d.p),
      qty: Number(d.q),
      time: Number(d.T),
      isBuyerMaker: Boolean(d.m),
    })
  }
  return ws
}

export async function fetchTrades(symbol: string, limit = 40): Promise<Trade[]> {
  const res = await fetch(`${BINANCE_REST}/api/v3/trades?symbol=${symbol}&limit=${limit}`)
  if (!res.ok) throw new Error('Binance trades alınamadı')
  const data = (await res.json()) as Record<string, string | number | boolean>[]
  return data.map((t) => ({
    id: Number(t.id),
    price: Number(t.price),
    qty: Number(t.qty),
    time: Number(t.time),
    isBuyerMaker: Boolean(t.isBuyerMaker),
  }))
}

export interface SymbolTicker {
  last: number
  changeAbs: number // 24s mutlak degisim (p)
  changePercent: number // 24s yuzde (P)
  high: number
  low: number
  weightedAvg: number // 24s agirlikli ortalama fiyat (w)
  baseVolume: number // 24s hacim, baz varlik (v)
  quoteVolume: number // 24s hacim, USDT (q)
}

/** Secili sembolun canli 24s ticker akisi (baslik icin). */
export function openTickerStream(
  symbol: string,
  onTick: (t: SymbolTicker) => void,
): WebSocket {
  const ws = new WebSocket(`${BINANCE_WS}/ws/${symbol.toLowerCase()}@ticker`)
  ws.onmessage = (event) => {
    const d = JSON.parse(event.data) as Record<string, string>
    onTick({
      last: Number(d.c),
      changeAbs: Number(d.p),
      changePercent: Number(d.P),
      high: Number(d.h),
      low: Number(d.l),
      weightedAvg: Number(d.w),
      baseVolume: Number(d.v),
      quoteVolume: Number(d.q),
    })
  }
  return ws
}

/** Canli mum akisi. onCandle her tick'te cagrilir; closed=true ise mum kapandi. */
export function openKlineStream(
  symbol: string,
  interval: Interval,
  onCandle: (candle: Candle, closed: boolean) => void,
): WebSocket {
  const ws = new WebSocket(`${BINANCE_WS}/ws/${symbol.toLowerCase()}@kline_${interval}`)
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data) as { k: Record<string, string | boolean | number> }
    const k = msg.k
    onCandle(
      {
        time: Math.floor(Number(k.t) / 1000),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
      },
      Boolean(k.x),
    )
  }
  return ws
}
