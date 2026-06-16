import { AlarmForm } from '@/components/AlarmForm'
import { AlarmList } from '@/components/AlarmList'

/** Tam ekran alarm yonetimi sayfasi. */
export function AlarmsPage() {
  return (
    <div className="mx-auto h-full max-w-5xl overflow-auto px-4 py-5">
      <h1 className="mb-1 text-xl font-bold text-bn-txt">Fiyat Alarmları</h1>
      <p className="mb-5 text-sm text-bn-sub">
        Hedef fiyata ulaşınca anında bildirim al. Motor borsadan canlı akışı dinler.
      </p>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
          <AlarmForm />
        </div>
        <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
          <AlarmList />
        </div>
      </div>
    </div>
  )
}
