import { useQuery } from '@tanstack/react-query'
import { fetchPrices } from '@/lib/binance'
import { usePortfolio } from '@/hooks/usePaper'
import type { Position } from '@/lib/paper'

export interface EnrichedPosition extends Position {
  currentPrice: number | null
  value: number | null
  pnl: number | null
  pnlPct: number | null
}

/**
 * Portfoyu canli fiyatlarla zenginlestirir: her pozisyonun anlik degeri ve gerceklesmemis
 * PNL'i + toplam equity (USDT + pozisyon degerleri) + toplam PNL.
 */
export function usePortfolioValue() {
  const { data: portfolio } = usePortfolio()
  const positions = portfolio?.positions ?? []
  const symbols = positions.map((p) => `${p.asset}USDT`)

  const { data: prices } = useQuery({
    queryKey: ['binance', 'held-prices', [...symbols].sort().join(',')],
    queryFn: () => fetchPrices(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 3000,
  })

  const enriched: EnrichedPosition[] = positions.map((p) => {
    const currentPrice = prices?.[`${p.asset}USDT`] ?? null
    const value = currentPrice != null ? currentPrice * p.qty : null
    const cost = p.avgPrice * p.qty
    const pnl = value != null ? value - cost : null
    const pnlPct = pnl != null && cost > 0 ? (pnl / cost) * 100 : null
    return { ...p, currentPrice, value, pnl, pnlPct }
  })

  const usdt = portfolio?.usdtBalance ?? 0
  const positionsValue = enriched.reduce(
    (sum, p) => sum + (p.value ?? p.avgPrice * p.qty),
    0,
  )
  const equity = usdt + positionsValue
  const totalPnl = enriched.reduce((sum, p) => sum + (p.pnl ?? 0), 0)

  return { usdt, enriched, equity, totalPnl }
}
