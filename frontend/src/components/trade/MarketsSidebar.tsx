import { useMemo, useState, type ReactNode } from 'react'
import { Search, Star } from 'lucide-react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useFavorites } from '@/hooks/useFavorites'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { fmtPrice } from '@/lib/symbolFormat'
import { CoinIcon } from '@/components/trade/CoinIcon'

type Tab = 'fav' | 'usdt'

export function MarketsSidebar() {
  const { data: tickers } = useMarketTickers()
  const { symbol, setSymbol } = useActiveSymbol()
  const { toggle, isFavorite } = useFavorites()
  const [tab, setTab] = useState<Tab>('usdt')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    let list = tickers ?? []
    if (tab === 'fav') list = list.filter((t) => isFavorite(t.symbol))
    if (query) {
      const q = query.toUpperCase()
      list = list.filter((t) => t.symbol.includes(q))
    } else if (tab === 'usdt') {
      list = list.slice(0, 150) // arama yokken en yuksek hacimli 150
    }
    return list
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

      <div className="flex gap-3 border-b border-bn-line px-3 text-xs">
        <TabBtn active={tab === 'fav'} onClick={() => setTab('fav')}>
          ★ Favoriler
        </TabBtn>
        <TabBtn active={tab === 'usdt'} onClick={() => setTab('usdt')}>
          USDT
        </TabBtn>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr_0.9fr] px-3 py-1.5 text-[10px] uppercase tracking-wide text-bn-sub">
        <span>Çift</span>
        <span className="text-right">Fiyat</span>
        <span className="text-right">24s%</span>
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
                className={`grid w-full grid-cols-[1.4fr_1fr_0.9fr] items-center px-3 py-1.5 text-xs transition hover:bg-bn-line/50 ${
                  active ? 'bg-bn-line/60' : ''
                }`}
              >
                <span className="flex items-center gap-1.5">
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
                  <span className="font-medium text-bn-txt">{base}</span>
                  <span className="text-bn-sub">/USDT</span>
                </span>
                <span className="text-right font-mono tabular-nums text-bn-txt">
                  {fmtPrice(t.symbol, t.lastPrice)}
                </span>
                <span
                  className={`text-right font-mono tabular-nums ${up ? 'text-bn-up' : 'text-bn-down'}`}
                >
                  {up ? '+' : ''}
                  {t.priceChangePercent.toFixed(2)}%
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
      className={`-mb-px border-b-2 py-2 transition ${
        active ? 'border-bn-gold text-bn-txt' : 'border-transparent text-bn-sub hover:text-bn-txt'
      }`}
    >
      {children}
    </button>
  )
}
