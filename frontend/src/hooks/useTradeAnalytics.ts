import { useMemo } from 'react'
import { usePaperOrders } from '@/hooks/usePaper'
import type { PaperOrder } from '@/lib/paper'

export interface RealizedTrade {
  symbol: string
  qty: number
  realized: number
  pct: number
  at: string
}

export interface TradeAnalytics {
  filledCount: number
  buyCount: number
  sellCount: number
  volumeUsdt: number
  realizedPnl: number
  winRate: number | null
  wins: number
  losses: number
  best: RealizedTrade | null
  worst: RealizedTrade | null
  trades: RealizedTrade[]
  daily: { date: string; pnl: number }[]
}

/**
 * Doldurulmus emirlerden gerceklesmis PNL analitigi (ortalama-maliyet yontemi): her varlik
 * icin BUY'lar maliyeti gunceller, SELL gerceklesmis kar/zarari yazar. Win-rate, en iyi/kotu
 * islem, gunluk PNL. Binance "PNL analizi" esinli.
 */
export function useTradeAnalytics(): TradeAnalytics {
  const { data: orders } = usePaperOrders()

  return useMemo(() => {
    const filled = (orders ?? [])
      .filter((o) => o.status === 'FILLED' && o.fillPrice != null)
      .sort((a, b) => new Date(a.filledAt ?? a.createdAt).getTime() - new Date(b.filledAt ?? b.createdAt).getTime())

    const book: Record<string, { qty: number; avg: number }> = {}
    const trades: RealizedTrade[] = []
    let volumeUsdt = 0
    let buyCount = 0
    let sellCount = 0

    for (const o of filled as PaperOrder[]) {
      const price = o.fillPrice as number
      volumeUsdt += price * o.qty
      const b = book[o.symbol] ?? { qty: 0, avg: 0 }
      if (o.side === 'BUY') {
        buyCount++
        const newQty = b.qty + o.qty
        b.avg = newQty > 0 ? (b.avg * b.qty + price * o.qty) / newQty : 0
        b.qty = newQty
      } else {
        sellCount++
        const realized = (price - b.avg) * o.qty
        const cost = b.avg * o.qty
        trades.push({
          symbol: o.symbol,
          qty: o.qty,
          realized,
          pct: cost > 0 ? (realized / cost) * 100 : 0,
          at: o.filledAt ?? o.createdAt,
        })
        b.qty = Math.max(0, b.qty - o.qty)
      }
      book[o.symbol] = b
    }

    const realizedPnl = trades.reduce((s, t) => s + t.realized, 0)
    const wins = trades.filter((t) => t.realized > 0).length
    const losses = trades.filter((t) => t.realized < 0).length
    const best = trades.reduce<RealizedTrade | null>((m, t) => (!m || t.realized > m.realized ? t : m), null)
    const worst = trades.reduce<RealizedTrade | null>((m, t) => (!m || t.realized < m.realized ? t : m), null)

    const dailyMap = new Map<string, number>()
    for (const t of trades) {
      const date = new Date(t.at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + t.realized)
    }
    const daily = [...dailyMap.entries()].map(([date, pnl]) => ({ date, pnl })).slice(-14)

    return {
      filledCount: filled.length,
      buyCount,
      sellCount,
      volumeUsdt,
      realizedPnl,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : null,
      wins,
      losses,
      best,
      worst,
      trades: [...trades].reverse(),
      daily,
    }
  }, [orders])
}
