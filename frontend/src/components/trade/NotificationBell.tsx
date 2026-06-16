import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell } from 'lucide-react'
import { clearNotifications, markAllRead, useNotifications } from '@/hooks/useNotifications'

/** Topbar bildirim zili: okunmamis rozeti + acilir gecmis (alarm tetikleme, emir vb.). */
export function NotificationBell() {
  const { items, unread } = useNotifications()

  return (
    <DropdownMenu.Root onOpenChange={(open) => open && markAllRead()}>
      <DropdownMenu.Trigger asChild>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-bn-sub transition hover:bg-bn-line hover:text-bn-txt">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-bn-down px-0.5 text-[9px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-72 rounded-md border border-bn-line bg-bn-panel p-1 text-bn-txt shadow-xl"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold">Bildirimler</span>
            {items.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-[10px] text-bn-sub transition hover:text-bn-txt"
              >
                Temizle
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-bn-sub">Bildirim yok</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="border-t border-bn-line/60 px-2 py-1.5">
                  <p className="text-xs text-bn-txt">{n.message}</p>
                  <p className="text-[10px] text-bn-sub">
                    {new Date(n.time).toLocaleTimeString('tr-TR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
