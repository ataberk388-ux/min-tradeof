import { Bell } from 'lucide-react'
import { UserMenu } from '@/components/layout/UserMenu'

export function TerminalTopbar() {
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
      </div>
      <UserMenu onSettings={() => {}} />
    </header>
  )
}
