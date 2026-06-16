import type { LucideIcon } from 'lucide-react'

/**
 * Bos tablo/panel durumlari icin tutarli, "dolu" hissettiren bos durum: ikon rozeti +
 * baslik + ipucu (+ istege bagli aksiyon). Tek satir "Kayit yok" yerine kullanilir.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bn-line/60 ring-1 ring-bn-line">
        <Icon className="h-6 w-6 text-bn-sub" />
      </div>
      <p className="text-sm font-medium text-bn-txt">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-bn-sub">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
