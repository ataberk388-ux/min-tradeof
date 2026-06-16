import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { fmtPrice } from '@/lib/symbolFormat'

/** Topbar coin arama: yaz -> eslesen coinler aninda listelenir -> tikla -> sec. */
export function SymbolSearch() {
  const { data } = useMarketTickers()
  const { setSymbol } = useActiveSymbol()
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

  const results = q
    ? (data ?? []).filter((t) => t.symbol.includes(q.toUpperCase())).slice(0, 15)
    : (data ?? []).slice(0, 15)

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
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-bn-line bg-bn-panel shadow-xl">
          <div className="p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="BTC, ETH, SOL…"
              className="w-full rounded border border-bn-line bg-bn-panel2 px-2 py-1.5 text-xs text-bn-txt outline-none focus:border-bn-gold/50"
            />
          </div>
          <div className="max-h-72 overflow-y-auto pb-1">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-bn-sub">Sonuç yok</p>
            ) : (
              results.map((t) => {
                const base = t.symbol.replace(/USDT$/, '')
                const up = t.priceChangePercent >= 0
                return (
                  <button
                    key={t.symbol}
                    onClick={() => pick(t.symbol)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-bn-line/50"
                  >
                    <CoinIcon asset={base} size={16} />
                    <span className="font-medium text-bn-txt">{base}</span>
                    <span className="text-bn-sub">/USDT</span>
                    <span className="ml-auto font-mono tabular-nums text-bn-txt">
                      {fmtPrice(t.symbol, t.lastPrice)}
                    </span>
                    <span className={`w-12 text-right font-mono tabular-nums ${up ? 'text-bn-up' : 'text-bn-down'}`}>
                      {up ? '+' : ''}
                      {t.priceChangePercent.toFixed(1)}%
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
