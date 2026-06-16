import { useEffect, useState } from 'react'
import { BarChart3, Bell, LineChart, Moon, Search, Sun, Wallet } from 'lucide-react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useTheme } from '@/hooks/useTheme'
import { navigateTo, type Route } from '@/hooks/useRoute'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { fmtPrice } from '@/lib/symbolFormat'

const PAGES: { route: Route; label: string; icon: typeof LineChart }[] = [
  { route: 'trade', label: 'İşlem terminali', icon: LineChart },
  { route: 'markets', label: 'Marketler', icon: BarChart3 },
  { route: 'portfolio', label: 'Portföy', icon: Wallet },
  { route: 'alarms', label: 'Alarmlar', icon: Bell },
]

/** Cmd/Ctrl+K ile acilan hizli komut paleti: coin ara + global komutlar. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { data } = useMarketTickers()
  const { setSymbol } = useActiveSymbol()
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  if (!open) return null

  const coins = (data ?? [])
    .filter((t) => !q || t.symbol.includes(q.toUpperCase()))
    .slice(0, 8)
  const themeMatch = !q || 'tema'.includes(q.toLowerCase()) || 'theme'.includes(q.toLowerCase())
  const pages = PAGES.filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()))

  const pick = (s: string) => {
    setSymbol(s)
    setOpen(false)
  }

  const goto = (r: Route) => {
    navigateTo(r)
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-bn-line bg-bn-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-bn-line px-3">
          <Search className="h-4 w-4 text-bn-sub" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Coin ara veya komut…  (Esc ile kapat)"
            className="w-full bg-transparent py-3 text-sm text-bn-txt outline-none placeholder:text-bn-sub"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {pages.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-bn-sub">Sayfalar</p>
              {pages.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.route}
                    onClick={() => goto(p.route)}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-bn-txt transition hover:bg-bn-line"
                  >
                    <Icon className="h-4 w-4 text-bn-gold" />
                    {p.label}
                  </button>
                )
              })}
            </>
          )}
          {themeMatch && (
            <button
              onClick={() => {
                toggle()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-bn-txt transition hover:bg-bn-line"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-bn-gold" /> : <Moon className="h-4 w-4 text-bn-gold" />}
              Tema değiştir ({theme === 'dark' ? 'Açık' : 'Koyu'})
            </button>
          )}

          <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-bn-sub">Coinler</p>
          {coins.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-bn-sub">Sonuç yok</p>
          ) : (
            coins.map((t) => {
              const base = t.symbol.replace(/USDT$/, '')
              const up = t.priceChangePercent >= 0
              return (
                <button
                  key={t.symbol}
                  onClick={() => pick(t.symbol)}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm transition hover:bg-bn-line"
                >
                  <CoinIcon asset={base} size={18} />
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
    </div>
  )
}
