import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useAuth } from '@/hooks/useAuth'

/** Cikis onay modali (kontrollu). Onaylaninca oturumu kapatir. */
export function ConfirmLogoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { logout } = useAuth()

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-bn-line bg-bn-panel p-6 shadow-2xl">
          <AlertDialog.Title className="text-lg font-semibold text-bn-txt">
            Çıkış yap
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-bn-sub">
            Çıkış yapmak istediğine emin misin? Tekrar girmek için kullanıcı adı ve şifren
            gerekecek.
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel className="rounded-md border border-bn-line px-4 py-2 text-sm text-bn-txt transition hover:bg-bn-line">
              Vazgeç
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={logout}
              className="rounded-md bg-bn-down px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Çıkış yap
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
