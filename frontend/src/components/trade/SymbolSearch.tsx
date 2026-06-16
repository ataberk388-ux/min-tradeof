import { useEffect, useRef, useState } from 'react'
import { Search, Star, TrendingUp } from 'lucide-react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useFavorites } from '@/hooks/useFavorites'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { fmtPrice } from '@/lib/symbolFormat'
import { formatCompact } from '@/lib/format'

/** Binance'in islem modu sekmeleri — bu demo yalniz Spot (paper) destekler. */
const MODES = ['Spot', 'Cross', 'Isolated', 'Grid'] as const

/** Topbar coin arama (Binance arama ekrani esinli): mod sekmeleri + popüler/favori + zengin satirlar. */
export function SymbolSearch() {
  const { data } = useMarketTickers()
  const { setSymbol } = useActiveSymbol()
  const { favorites, toggle, isFavorite } = useFavorites()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const all = data ?? []
  const results = q ? all.filter((t) => t.symbol.includes(q.toUpperCase())).slice(0, 30) : []
  const favList = all.filter((t) => isFavorite(t.symbol)).slice(0, 8)
  const popular = all.slice(0, 8)

  const pick = (sym: string) => {
    setSymbol(sym)
    setOpen(false)
    setQ('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-bn-line bg-bn-panel2 px-2 py-1.5 text-xs text-bn-sub transition hover:text-bn-txt"
      >
        <Search className="h-3.5 w-3.5" />
        Coin ara
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-bn-line bg-bn-panel shadow-2xl">
          {/* Arama kutusu */}
          <div className="border-b border-bn-line p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bn-sub" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ara (BTC, ETH, SOL…)"
                className="w-full rounded-md border border-bn-line bg-bn-panel2 py-2 pl-8 pr-3 text-sm text-bn-txt outline-none focus:border-bn-gold/50"
              />
            </div>
          </div>

          {/* Mod sekmeleri (Binance) */}
          <div className="flex gap-1 border-b border-bn-line px-2.5 py-2 text-[11px]">
            {MODES.map((m) => (
              <button
                key={m}
                disabled={m !== 'Spot'}
                title={m === 'Spot' ? undefined : 'Bu demo yalnızca Spot destekler'}
                className={`rounded px-2 py-1 transition ${
                  m === 'Spot'
                    ? 'bg-bn-gold/15 font-semibold text-bn-gold'
                    : 'cursor-not-allowed text-bn-sub/40'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {q ? (
              results.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-bn-sub">"{q}" için sonuç yok</p>
              ) : (
                <Section>{results.map((t) => (
                  <Row key={t.symbol} t={t} onPick={pick} onStar={toggle} starred={isFavorite(t.symbol)} />
                ))}</Section>
              )
            ) : (
              <>
                {favList.length > 0 && (
                  <>
                    <Header icon={<Star className="h-3 w-3 fill-bn-gold text-bn-gold" />}>Favoriler</Header>
                    <Section>{favList.map((t) => (
                      <Row key={t.symbol} t={t} onPick={pick} onStar={toggle} starred />
                    ))}</Section>
                  </>
                )}
                <Header icon={<TrendingUp className="h-3 w-3 text-bn-gold" />}>Popüler</Header>
                <Section>{popular.map((t) => (
                  <Row key={t.symbol} t={t} onPick={pick} onStar={toggle} starred={isFavorite(t.symbol)} />
                ))}</Section>
              </>
            )}
          </div>

          <div className="border-t border-bn-line px-3 py-1.5 text-[10px] text-bn-sub">
            {favorites.length} favori · {all.length} market
          </div>
        </div>
      )}
    </div>
  )
}

function Header({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-bn-sub">
      {icon}
      {children}
    </p>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="pb-1">{children}</div>
}

function Row({
  t,
  onPick,
  onStar,
  starred,
}: {
  t: { symbol: string; lastPrice: number; priceChangePercent: number; quoteVolume: number }
  onPick: (s: string) => void
  onStar: (s: string) => void
  starred: boolean
}) {
  const base = t.symbol.replace(/USDT$/, '')
  const up = t.priceChangePercent >= 0
  return (
    <div className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-bn-line/50">
      <button onClick={() => onStar(t.symbol)} aria-label="Favori" className="shrink-0">
        <Star className={`h-3.5 w-3.5 ${starred ? 'fill-bn-gold text-bn-gold' : 'text-bn-sub hover:text-bn-gold'}`} />
      </button>
      <button onClick={() => onPick(t.symbol)} className="flex flex-1 items-center gap-2 text-left">
        <CoinIcon asset={base} size={20} />
        <span className="font-medium text-bn-txt">{base}</span>
        <span className="text-bn-sub">/USDT</span>
        <span className="ml-1 hidden text-[10px] text-bn-sub sm:inline">Vol {formatCompact(t.quoteVolume)}</span>
        <span className="ml-auto font-mono tabular-nums text-bn-txt">{fmtPrice(t.symbol, t.lastPrice)}</span>
        <span className={`w-14 text-right font-mono tabular-nums ${up ? 'text-bn-up' : 'text-bn-down'}`}>
          {up ? '+' : ''}
          {t.priceChangePercent.toFixed(1)}%
        </span>
      </button>
    </div>
  )
}
