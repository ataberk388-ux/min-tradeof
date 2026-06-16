import { ArrowLeftRight, BarChart3, BookOpen, LineChart, Wallet } from 'lucide-react'

export type MobileTab = 'markets' | 'chart' | 'book' | 'trade' | 'wallet'

const TABS: { id: MobileTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'markets', label: 'Piyasa', icon: BarChart3 },
  { id: 'chart', label: 'Grafik', icon: LineChart },
  { id: 'book', label: 'Defter', icon: BookOpen },
  { id: 'trade', label: 'İşlem', icon: ArrowLeftRight },
  { id: 'wallet', label: 'Cüzdan', icon: Wallet },
]

export function MobileTabBar({
  value,
  onChange,
}: {
  value: MobileTab
  onChange: (t: MobileTab) => void
}) {
  return (
    <nav className="flex shrink-0 border-t border-bn-line bg-bn-panel">
      {TABS.map((t) => {
        const Icon = t.icon
        const active = value === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition ${
              active ? 'text-bn-gold' : 'text-bn-sub'
            }`}
          >
            <Icon className="h-5 w-5" />
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
