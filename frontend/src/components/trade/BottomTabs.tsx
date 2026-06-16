import type { ReactNode } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { toast } from 'sonner'
import { Ban, History, Inbox, Layers, Wallet, X } from 'lucide-react'
import { AlarmForm } from '@/components/AlarmForm'
import { AlarmList } from '@/components/AlarmList'
import { EmptyState } from '@/components/trade/EmptyState'
import { useCancelOrder, usePaperOrders } from '@/hooks/usePaper'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'
import { useConditionalOrders } from '@/hooks/useConditionalOrders'
import { formatNum } from '@/lib/format'
import { fmtPrice, fmtQty } from '@/lib/symbolFormat'
import type { ApiError } from '@/lib/api'
import type { PaperOrder } from '@/lib/paper'

/** Kisa tarih+saat (tr): "14:32" bugun, yoksa "12.06 14:32". */
function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function BottomTabs() {
  const { data: orders } = usePaperOrders()
  const { orders: conditional } = useConditionalOrders()
  const { enriched } = usePortfolioValue()
  const openOrders = (orders ?? []).filter((o) => o.status === 'OPEN')
  const closedOrders = (orders ?? []).filter((o) => o.status !== 'OPEN')

  return (
    <Tabs.Root defaultValue="open" className="flex h-full flex-col bg-bn-panel">
      <Tabs.List className="flex gap-5 border-b border-bn-line px-3 text-xs">
        <Trigger value="open">Açık Emirler{openOrders.length > 0 && <Count n={openOrders.length} />}</Trigger>
        <Trigger value="conditional">Koşullu{conditional.length > 0 && <Count n={conditional.length} />}</Trigger>
        <Trigger value="history">Emir Geçmişi{closedOrders.length > 0 && <Count n={closedOrders.length} muted />}</Trigger>
        <Trigger value="positions">Pozisyonlar{enriched.length > 0 && <Count n={enriched.length} />}</Trigger>
        <Trigger value="alarms">Alarmlarım</Trigger>
      </Tabs.List>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Tabs.Content value="open" className="h-full">
          <OrdersTable orders={openOrders} cancellable />
        </Tabs.Content>
        <Tabs.Content value="conditional" className="h-full">
          <ConditionalTable />
        </Tabs.Content>
        <Tabs.Content value="history" className="h-full">
          <OrdersTable orders={closedOrders} />
        </Tabs.Content>
        <Tabs.Content value="positions" className="h-full">
          <PositionsTable />
        </Tabs.Content>
        <Tabs.Content value="alarms">
          <div className="grid gap-4 p-3 md:grid-cols-2">
            <AlarmForm />
            <AlarmList />
          </div>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  )
}

function Count({ n, muted }: { n: number; muted?: boolean }) {
  return (
    <span
      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        muted ? 'bg-bn-line text-bn-sub' : 'bg-bn-gold/15 text-bn-gold'
      }`}
    >
      {n}
    </span>
  )
}

function Trigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className="-mb-px flex items-center border-b-2 border-transparent py-2 text-bn-sub transition data-[state=active]:border-bn-gold data-[state=active]:text-bn-txt"
    >
      {children}
    </Tabs.Trigger>
  )
}

function OrdersTable({ orders, cancellable }: { orders: PaperOrder[]; cancellable?: boolean }) {
  const cancel = useCancelOrder()

  if (orders.length === 0) {
    return cancellable ? (
      <EmptyState
        icon={Inbox}
        title="Açık emrin yok"
        hint="Verdiğin limit emirler dolana kadar burada bekler. Emir formundan bir limit emir oluştur."
      />
    ) : (
      <EmptyState
        icon={History}
        title="Emir geçmişin boş"
        hint="Dolduran veya iptal ettiğin emirler burada listelenir."
      />
    )
  }

  const onCancel = (id: number) =>
    cancel.mutate(id, {
      onSuccess: () => toast.success('Emir iptal edildi'),
      onError: (err) => toast.error((err as unknown as ApiError).message ?? 'İptal başarısız'),
    })

  const cancelAll = () => {
    orders.forEach((o) => cancel.mutate(o.id))
    toast.success('Tüm açık emirler iptal ediliyor')
  }

  return (
    <div className="flex h-full flex-col">
      {cancellable && (
        <div className="flex items-center justify-between border-b border-bn-line/60 px-3 py-1.5">
          <span className="text-[11px] text-bn-sub">{orders.length} açık emir</span>
          <button
            onClick={cancelAll}
            disabled={cancel.isPending}
            className="flex items-center gap-1 text-[11px] text-bn-sub transition hover:text-bn-down disabled:opacity-50"
          >
            <Ban className="h-3 w-3" />
            Tümünü iptal et
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-bn-sub">
              <th className="px-3 py-1.5 font-medium">Zaman</th>
              <th className="px-3 py-1.5 font-medium">Çift</th>
              <th className="px-3 py-1.5 font-medium">Yön</th>
              <th className="px-3 py-1.5 font-medium">Tür</th>
              <th className="px-3 py-1.5 text-right font-medium">Fiyat</th>
              <th className="px-3 py-1.5 text-right font-medium">Miktar</th>
              <th className="px-3 py-1.5 text-right font-medium">Toplam</th>
              <th className="px-3 py-1.5 font-medium">Durum</th>
              {cancellable && <th className="px-3 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const px = o.fillPrice ?? o.price
              const total = px != null ? px * o.qty : null
              return (
                <tr key={o.id} className="border-t border-bn-line/60 transition hover:bg-bn-line/30">
                  <td className="px-3 py-1.5 text-bn-sub">{fmtWhen(o.filledAt ?? o.createdAt)}</td>
                  <td className="px-3 py-1.5 font-medium text-bn-txt">{o.symbol}</td>
                  <td className={`px-3 py-1.5 ${o.side === 'BUY' ? 'text-bn-up' : 'text-bn-down'}`}>
                    {o.side === 'BUY' ? 'AL' : 'SAT'}
                  </td>
                  <td className="px-3 py-1.5 text-bn-sub">{o.type === 'MARKET' ? 'Piyasa' : 'Limit'}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-bn-txt">
                    {px != null ? fmtPrice(o.symbol, px) : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-bn-txt">{fmtQty(o.symbol, o.qty)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-bn-sub">
                    {total != null ? formatNum(total, 2) : '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span
                      className={
                        o.status === 'FILLED'
                          ? 'text-bn-up'
                          : o.status === 'CANCELLED'
                            ? 'text-bn-sub'
                            : 'text-bn-gold'
                      }
                    >
                      {o.status === 'FILLED' ? 'Doldu' : o.status === 'CANCELLED' ? 'İptal' : 'Açık'}
                    </span>
                  </td>
                  {cancellable && (
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => onCancel(o.id)}
                        className="text-bn-sub transition hover:text-bn-down"
                        aria-label="İptal"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConditionalTable() {
  const { orders, remove } = useConditionalOrders()
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Koşullu emrin yok"
        hint="Emir formundaki Stop-Limit veya OCO sekmesinden tetikli emir kur; fiyat seviyene gelince otomatik açılır."
      />
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-bn-sub">
            <th className="px-3 py-1.5 font-medium">Çift</th>
            <th className="px-3 py-1.5 font-medium">Tür</th>
            <th className="px-3 py-1.5 font-medium">Yön</th>
            <th className="px-3 py-1.5 text-right font-medium">Stop</th>
            <th className="px-3 py-1.5 text-right font-medium">Limit</th>
            <th className="px-3 py-1.5 text-right font-medium">TP</th>
            <th className="px-3 py-1.5 text-right font-medium">Miktar</th>
            <th className="px-3 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-bn-line/60 transition hover:bg-bn-line/30">
              <td className="px-3 py-1.5 font-medium text-bn-txt">{o.symbol}</td>
              <td className="px-3 py-1.5 text-bn-gold">{o.kind === 'OCO' ? 'OCO' : 'Stop-Limit'}</td>
              <td className={`px-3 py-1.5 ${o.side === 'BUY' ? 'text-bn-up' : 'text-bn-down'}`}>
                {o.side === 'BUY' ? 'AL' : 'SAT'}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-bn-txt">{fmtPrice(o.symbol, o.stopPrice)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-bn-txt">{fmtPrice(o.symbol, o.limitPrice)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-bn-sub">
                {o.tpPrice != null ? fmtPrice(o.symbol, o.tpPrice) : '—'}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-bn-txt">{fmtQty(o.symbol, o.qty)}</td>
              <td className="px-3 py-1.5 text-right">
                <button
                  onClick={() => {
                    remove(o.id)
                    toast.success('Koşullu emir kaldırıldı')
                  }}
                  className="text-bn-sub transition hover:text-bn-down"
                  aria-label="Kaldır"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PositionsTable() {
  const { enriched } = usePortfolioValue()
  if (enriched.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Açık pozisyonun yok"
        hint="Bir coin satın aldığında pozisyonun, canlı değeri ve PNL'i burada görünür."
      />
    )
  }
  const totalValue = enriched.reduce((s, p) => s + (p.value ?? p.avgPrice * p.qty), 0)
  const totalPnl = enriched.reduce((s, p) => s + (p.pnl ?? 0), 0)
  const totalUp = totalPnl >= 0

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-bn-sub">
            <th className="px-3 py-1.5 font-medium">Varlık</th>
            <th className="px-3 py-1.5 text-right font-medium">Miktar</th>
            <th className="px-3 py-1.5 text-right font-medium">Ort. Maliyet</th>
            <th className="px-3 py-1.5 text-right font-medium">Son Fiyat</th>
            <th className="px-3 py-1.5 text-right font-medium">Değer</th>
            <th className="px-3 py-1.5 text-right font-medium">PNL</th>
          </tr>
        </thead>
        <tbody>
          {enriched.map((p) => {
            const up = (p.pnl ?? 0) >= 0
            return (
              <tr key={p.asset} className="border-t border-bn-line/60 transition hover:bg-bn-line/30">
                <td className="px-3 py-1.5 font-medium text-bn-txt">{p.asset}</td>
                <td className="px-3 py-1.5 text-right font-mono text-bn-txt">{fmtQty(`${p.asset}USDT`, p.qty)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-bn-txt">{fmtPrice(`${p.asset}USDT`, p.avgPrice)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-bn-txt">
                  {p.currentPrice != null ? fmtPrice(`${p.asset}USDT`, p.currentPrice) : '—'}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-bn-sub">
                  {p.value != null ? formatNum(p.value, 2) : '—'}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${up ? 'text-bn-up' : 'text-bn-down'}`}>
                  {p.pnl != null
                    ? `${up ? '+' : ''}${formatNum(p.pnl, 2)} (${p.pnlPct! >= 0 ? '+' : ''}${p.pnlPct!.toFixed(2)}%)`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-bn-line bg-bn-panel2/40 font-medium">
            <td className="px-3 py-1.5 text-bn-txt" colSpan={4}>
              Toplam
            </td>
            <td className="px-3 py-1.5 text-right font-mono text-bn-txt">{formatNum(totalValue, 2)}</td>
            <td className={`px-3 py-1.5 text-right font-mono ${totalUp ? 'text-bn-up' : 'text-bn-down'}`}>
              {totalUp ? '+' : ''}
              {formatNum(totalPnl, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
