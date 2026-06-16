import { useMemo } from 'react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useFavorites } from '@/hooks/useFavorites'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { fmtPrice } from '@/lib/symbolFormat'

/** Binance tarzi ust ticker seridi: favori coinler (yoksa en hacimliler), canli fiyat + %. */
export function WatchlistBar() {
  const { data } = useMarketTickers()
  const { favorites } = useFavorites()
  const { setSymbol } = useActiveSymbol()

  const coins = useMemo(() => {
    const list = data ?? []
    if (favorites.length > 0) return list.filter((t) => favorites.includes(t.symbol))
    return list.slice(0, 15)
  }, [data, favorites])

  if (coins.length === 0) return null

  return (
    <div className="flex h-8 shrink-0 items-center gap-4 overflow-x-auto border-b border-bn-line bg-bn-panel px-3">
      {coins.map((t) => {
        const base = t.symbol.replace(/USDT$/, '')
        const up = t.priceChangePercent >= 0
        return (
          <button
            key={t.symbol}
            onClick={() => setSymbol(t.symbol)}
            className="flex shrink-0 items-center gap-1.5 text-xs transition hover:opacity-80"
          >
            <span className="font-medium text-bn-sub">{base}</span>
            <span className="font-mono tabular-nums text-bn-txt">{fmtPrice(t.symbol, t.lastPrice)}</span>
            <span className={`font-mono tabular-nums ${up ? 'text-bn-up' : 'text-bn-down'}`}>
              {up ? '+' : ''}
              {t.priceChangePercent.toFixed(2)}%
            </span>
          </button>
        )
      })}
    </div>
  )
}
