import { Bell, Moon, Sun } from 'lucide-react'
import { UserMenu } from '@/components/layout/UserMenu'
import { NotificationBell } from '@/components/trade/NotificationBell'
import { HeatmapButton } from '@/components/trade/HeatmapButton'
import { SymbolSearch } from '@/components/trade/SymbolSearch'
import { useTheme } from '@/hooks/useTheme'
import { useRoute, type Route } from '@/hooks/useRoute'

const NAV: { key: Route; label: string }[] = [
  { key: 'trade', label: 'İşlem' },
  { key: 'markets', label: 'Marketler' },
  { key: 'portfolio', label: 'Portföy' },
  { key: 'alarms', label: 'Alarmlar' },
]

export function TerminalTopbar() {
  const { theme, toggle } = useTheme()
  const { route, navigate } = useRoute()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-bn-line bg-bn-panel px-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('trade')} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-bn-gold">
            <Bell className="h-4 w-4 text-bn-bg" />
          </div>
          <span className="font-bold text-bn-txt">Crypto Alarm</span>
        </button>
        <span className="ml-1 rounded bg-bn-line px-1.5 py-0.5 text-[10px] font-medium text-bn-sub">
          SPOT · Paper
        </span>

        <nav className="ml-3 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => navigate(n.key)}
              className={`rounded px-2.5 py-1 text-sm transition ${
                route === n.key
                  ? 'font-semibold text-bn-txt'
                  : 'text-bn-sub hover:text-bn-txt'
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {route === 'trade' && (
          <div className="ml-2 hidden lg:block">
            <SymbolSearch />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <HeatmapButton />
        <NotificationBell />
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-bn-sub transition hover:bg-bn-line hover:text-bn-txt"
          aria-label="Tema değiştir"
          title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <UserMenu onSettings={() => {}} />
      </div>
    </header>
  )
}
