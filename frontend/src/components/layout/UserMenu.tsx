import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ConfirmLogoutDialog } from '@/components/layout/ConfirmLogoutDialog'

/** Avatar + acilir menu (Ayarlar / Cikis). Cikis onay modali tetikler. */
export function UserMenu({ onSettings }: { onSettings: () => void }) {
  const { username } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const initial = (username ?? '?').charAt(0).toUpperCase()

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-md border border-bn-line bg-bn-panel px-2 py-1.5 text-sm text-bn-txt outline-none transition hover:bg-bn-line">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bn-gold text-xs font-bold text-bn-bg">
              {initial}
            </span>
            <span className="hidden sm:inline">{username}</span>
            <ChevronDown className="h-4 w-4 text-bn-sub" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-[12rem] rounded-md border border-bn-line bg-bn-panel p-1 text-bn-txt shadow-xl"
          >
            <DropdownMenu.Label className="px-2 py-1.5 text-xs text-bn-sub">
              {username}
            </DropdownMenu.Label>
            <DropdownMenu.Separator className="my-1 h-px bg-bn-line" />
            <DropdownMenu.Item
              onSelect={onSettings}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition focus:bg-bn-line"
            >
              <Settings className="h-4 w-4" />
              Ayarlar
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault()
                setConfirmOpen(true)
              }}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-bn-down outline-none transition focus:bg-bn-down/10"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmLogoutDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  )
}
