import { useEffect, useState } from 'react'
import { ChevronDown, Moon, Sun } from 'lucide-react'
import { closeWs, openTickerStream } from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useTheme } from '@/hooks/useTheme'
import { fmtPrice } from '@/lib/symbolFormat'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { NotificationBell } from '@/components/trade/NotificationBell'
import { HeatmapButton } from '@/components/trade/HeatmapButton'
import { UserMenu } from '@/components/layout/UserMenu'

/** Mobil ince ust bar: sembol + canli fiyat (dokun -> piyasalar) + bildirim/tema/kullanici. */
export function MobileTopbar({ onSymbolTap }: { onSymbolTap: () => void }) {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const { theme, toggle } = useTheme()
  const [last, setLast] = useState<number | null>(null)
  const [chg, setChg] = useState(0)

  useEffect(() => {
    setLast(null)
    const ws = openTickerStream(symbol, (t) => {
      setLast(t.last)
      setChg(t.changePercent)
    })
    return () => closeWs(ws)
  }, [symbol])

  const base = symbol.replace(/USDT$/, '')
  const up = chg >= 0

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-bn-line bg-bn-panel px-3">
      <button onClick={onSymbolTap} className="flex items-center gap-1.5">
        <CoinIcon asset={base} size={20} />
        <span className="font-bold text-bn-txt">{base}/USDT</span>
        <ChevronDown className="h-3.5 w-3.5 text-bn-sub" />
        <span className={`ml-1 font-mono text-sm ${up ? 'text-bn-up' : 'text-bn-down'}`}>
          {last != null ? fmtPrice(symbol, last) : '—'}
        </span>
        <span className={`text-xs ${up ? 'text-bn-up' : 'text-bn-down'}`}>
          {up ? '+' : ''}
          {chg.toFixed(2)}%
        </span>
      </button>
      <div className="flex items-center gap-0.5">
        <HeatmapButton />
        <NotificationBell />
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-bn-sub transition hover:bg-bn-line"
          aria-label="Tema"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <UserMenu onSettings={() => {}} />
      </div>
    </header>
  )
}
