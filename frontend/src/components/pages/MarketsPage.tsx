import { useMemo, useState, type ReactNode } from 'react'
import { Search, Star } from 'lucide-react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useFavorites } from '@/hooks/useFavorites'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useRoute } from '@/hooks/useRoute'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { Sparkline } from '@/components/trade/Sparkline'
import { fmtPrice } from '@/lib/symbolFormat'
import { formatCompact } from '@/lib/format'

type Tab = 'fav' | 'usdt' | 'gainers' | 'losers'

/** Tam ekran market tablosu (Binance "Markets" sayfasi esinli). */
export function MarketsPage() {
  const { data: tickers } = useMarketTickers()
  const { setSymbol } = useActiveSymbol()
  const { toggle, isFavorite } = useFavorites()
  const { navigate } = useRoute()
  const [tab, setTab] = useState<Tab>('usdt')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const list = tickers ?? []
    if (query) {
      const q = query.toUpperCase()
      return list.filter((t) => t.symbol.includes(q)).slice(0, 100)
    }
    if (tab === 'fav') return list.filter((t) => isFavorite(t.symbol))
    if (tab === 'gainers')
      return [...list].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 80)
    if (tab === 'losers')
      return [...list].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 80)
    return list.slice(0, 120)
  }, [tickers, tab, query, isFavorite])

  const open = (symbol: string) => {
    setSymbol(symbol)
    navigate('trade')
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-bn-txt">Marketler</h1>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bn-sub" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Coin ara…"
            className="w-full rounded-md border border-bn-line bg-bn-panel2 py-2 pl-8 pr-3 text-sm text-bn-txt outline-none placeholder:text-bn-sub focus:border-bn-gold/50"
          />
        </div>
      </div>

      <div className="mb-1 flex gap-5 border-b border-bn-line text-sm">
        <TabBtn active={tab === 'fav'} onClick={() => setTab('fav')}>★ Favoriler</TabBtn>
        <TabBtn active={tab === 'usdt'} onClick={() => setTab('usdt')}>USDT</TabBtn>
        <TabBtn active={tab === 'gainers'} onClick={() => setTab('gainers')}>Yükselenler</TabBtn>
        <TabBtn active={tab === 'losers'} onClick={() => setTab('losers')}>Düşenler</TabBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-b-md">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-bn-panel">
            <tr className="text-left text-[11px] uppercase tracking-wide text-bn-sub">
              <th className="px-3 py-2 font-medium">Çift</th>
              <th className="px-3 py-2 text-right font-medium">Son Fiyat</th>
              <th className="px-3 py-2 text-right font-medium">24s %</th>
              <th className="px-3 py-2 text-right font-medium">24s Yüksek</th>
              <th className="px-3 py-2 text-right font-medium">24s Düşük</th>
              <th className="px-3 py-2 text-right font-medium">24s Hacim</th>
              <th className="px-3 py-2 text-right font-medium">Son 6s</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-bn-sub">
                  {tab === 'fav' ? 'Henüz favori yok — yıldıza tıkla' : 'Yükleniyor…'}
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const base = t.symbol.replace(/USDT$/, '')
                const up = t.priceChangePercent >= 0
                return (
                  <tr
                    key={t.symbol}
                    onClick={() => open(t.symbol)}
                    className="cursor-pointer border-t border-bn-line/50 transition hover:bg-bn-line/40"
                  >
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <Star
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(t.symbol)
                          }}
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isFavorite(t.symbol)
                              ? 'fill-bn-gold text-bn-gold'
                              : 'text-bn-sub hover:text-bn-gold'
                          }`}
                        />
                        <CoinIcon asset={base} size={20} />
                        <span className="font-medium text-bn-txt">{base}</span>
                        <span className="text-xs text-bn-sub">/USDT</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-bn-txt">
                      {fmtPrice(t.symbol, t.lastPrice)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${up ? 'text-bn-up' : 'text-bn-down'}`}>
                      {up ? '+' : ''}
                      {t.priceChangePercent.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-bn-sub">
                      {fmtPrice(t.symbol, t.highPrice)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-bn-sub">
                      {fmtPrice(t.symbol, t.lowPrice)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-bn-sub">
                      {formatCompact(t.quoteVolume)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex justify-end">
                        <Sparkline symbol={t.symbol} up={up} />
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          open(t.symbol)
                        }}
                        className="rounded border border-bn-line px-2.5 py-1 text-xs font-medium text-bn-gold transition hover:bg-bn-gold hover:text-bn-bg"
                      >
                        İşlem
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 py-2 transition ${
        active ? 'border-bn-gold font-medium text-bn-txt' : 'border-transparent text-bn-sub hover:text-bn-txt'
      }`}
    >
      {children}
    </button>
  )
}
