import { useMemo, useState, type ReactNode } from 'react'
import { Search, Star } from 'lucide-react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useFavorites } from '@/hooks/useFavorites'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { fmtPrice } from '@/lib/symbolFormat'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { Sparkline } from '@/components/trade/Sparkline'

type Tab = 'fav' | 'usdt' | 'gainers' | 'losers'

export function MarketsSidebar() {
  const { data: tickers } = useMarketTickers()
  const { symbol, setSymbol } = useActiveSymbol()
  const { toggle, isFavorite } = useFavorites()
  const [tab, setTab] = useState<Tab>('usdt')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const list = tickers ?? []
    if (query) {
      const q = query.toUpperCase()
      return list.filter((t) => t.symbol.includes(q)).slice(0, 60)
    }
    if (tab === 'fav') return list.filter((t) => isFavorite(t.symbol))
    if (tab === 'gainers')
      return [...list].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 40)
    if (tab === 'losers')
      return [...list].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 40)
    return list.slice(0, 50) // USDT: hacme gore
  }, [tickers, tab, query, isFavorite])

  return (
    <div className="flex h-full min-h-0 flex-col bg-bn-panel">
      <div className="p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-bn-sub" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara"
            className="w-full rounded border border-bn-line bg-bn-panel2 py-1.5 pl-7 pr-2 text-xs text-bn-txt outline-none placeholder:text-bn-sub focus:border-bn-gold/50"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-bn-line px-2 text-[11px]">
        <TabBtn active={tab === 'fav'} onClick={() => setTab('fav')}>
          ★
        </TabBtn>
        <TabBtn active={tab === 'usdt'} onClick={() => setTab('usdt')}>
          USDT
        </TabBtn>
        <TabBtn active={tab === 'gainers'} onClick={() => setTab('gainers')}>
          Yükselen
        </TabBtn>
        <TabBtn active={tab === 'losers'} onClick={() => setTab('losers')}>
          Düşen
        </TabBtn>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_44px] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wide text-bn-sub">
        <span>Çift</span>
        <span className="text-right">Fiyat / 24s%</span>
        <span className="text-right">6s</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-bn-sub">
            {tab === 'fav' ? 'Favori yok — yıldızla' : 'Yükleniyor…'}
          </p>
        ) : (
          rows.map((t) => {
            const base = t.symbol.replace(/USDT$/, '')
            const up = t.priceChangePercent >= 0
            const active = t.symbol === symbol
            return (
              <button
                key={t.symbol}
                onClick={() => setSymbol(t.symbol)}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-bn-line/50 ${
                  active ? 'bg-bn-line/60' : ''
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Star
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(t.symbol)
                    }}
                    className={`h-3 w-3 shrink-0 ${
                      isFavorite(t.symbol)
                        ? 'fill-bn-gold text-bn-gold'
                        : 'text-bn-sub hover:text-bn-gold'
                    }`}
                  />
                  <CoinIcon asset={base} size={16} />
                  <span className="truncate font-medium text-bn-txt">{base}</span>
                </span>

                <span className="text-right">
                  <span className="block font-mono tabular-nums text-bn-txt">
                    {fmtPrice(t.symbol, t.lastPrice)}
                  </span>
                  <span
                    className={`block font-mono text-[10px] tabular-nums ${up ? 'text-bn-up' : 'text-bn-down'}`}
                  >
                    {up ? '+' : ''}
                    {t.priceChangePercent.toFixed(2)}%
                  </span>
                </span>

                <span className="flex justify-end">
                  <Sparkline symbol={t.symbol} up={up} />
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px shrink-0 border-b-2 py-2 transition ${
        active ? 'border-bn-gold text-bn-txt' : 'border-transparent text-bn-sub hover:text-bn-txt'
      }`}
    >
      {children}
    </button>
  )
}
