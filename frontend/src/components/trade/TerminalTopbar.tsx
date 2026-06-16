import { Bell, Moon, Sun } from 'lucide-react'
import { UserMenu } from '@/components/layout/UserMenu'
import { NotificationBell } from '@/components/trade/NotificationBell'
import { HeatmapButton } from '@/components/trade/HeatmapButton'
import { SymbolSearch } from '@/components/trade/SymbolSearch'
import { useTheme } from '@/hooks/useTheme'

export function TerminalTopbar() {
  const { theme, toggle } = useTheme()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-bn-line bg-bn-panel px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-bn-gold">
          <Bell className="h-4 w-4 text-bn-bg" />
        </div>
        <span className="font-bold text-bn-txt">Crypto Alarm</span>
        <span className="ml-2 rounded bg-bn-line px-1.5 py-0.5 text-[10px] font-medium text-bn-sub">
          SPOT · Paper
        </span>
        <div className="ml-2">
          <SymbolSearch />
        </div>
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
