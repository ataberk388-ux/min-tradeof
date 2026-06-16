import { useMemo, type ReactNode } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'
import { usePaperOrders, useResetPaper } from '@/hooks/usePaper'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useRoute } from '@/hooks/useRoute'
import { AnalyticsView } from '@/components/pages/AnalyticsView'
import { formatNum } from '@/lib/format'
import { fmtPrice, fmtQty } from '@/lib/symbolFormat'

const SLICE_COLORS = ['#F0B90B', '#4AA9FF', '#0ECB81', '#9B87F5', '#F7931A', '#F6465D', '#2DD4BF', '#E879F9']

/** Tam ekran portfoy/cuzdan sayfasi: ozet + varlik dagilimi + pozisyonlar + islem gecmisi. */
export function PortfolioPage() {
  const { usdt, enriched, equity, totalPnl } = usePortfolioValue()
  const { data: orders } = usePaperOrders()
  const reset = useResetPaper()
  const { setSymbol } = useActiveSymbol()
  const { navigate } = useRoute()

  const pnlUp = totalPnl >= 0
  const pnlPct = equity - totalPnl > 0 ? (totalPnl / (equity - totalPnl)) * 100 : 0

  const allocation = useMemo(() => {
    const slices = [
      { name: 'USDT', value: usdt },
      ...enriched.map((p) => ({ name: p.asset, value: p.value ?? p.avgPrice * p.qty })),
    ].filter((s) => s.value > 0.01)
    return slices.sort((a, b) => b.value - a.value)
  }, [usdt, enriched])

  const onReset = () =>
    reset.mutate(undefined, { onSuccess: () => toast.success('Paper hesap sıfırlandı (10.000 USDT)') })

  const openTrade = (asset: string) => {
    setSymbol(`${asset}USDT`)
    navigate('trade')
  }

  const history = (orders ?? []).filter((o) => o.status !== 'OPEN').slice(0, 30)

  return (
    <div className="mx-auto h-full max-w-6xl overflow-auto px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-bn-txt">Portföy</h1>
        <button
          onClick={onReset}
          disabled={reset.isPending}
          className="flex items-center gap-1.5 rounded-md border border-bn-line px-3 py-1.5 text-sm text-bn-sub transition hover:text-bn-gold disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Hesabı sıfırla
        </button>
      </div>

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="mb-4 flex gap-5 border-b border-bn-line text-sm">
          <Tabs.Trigger value="overview" className="-mb-px border-b-2 border-transparent py-2 text-bn-sub transition data-[state=active]:border-bn-gold data-[state=active]:font-medium data-[state=active]:text-bn-txt">
            Genel Bakış
          </Tabs.Trigger>
          <Tabs.Trigger value="analiz" className="-mb-px border-b-2 border-transparent py-2 text-bn-sub transition data-[state=active]:border-bn-gold data-[state=active]:font-medium data-[state=active]:text-bn-txt">
            Analiz
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="analiz">
          <AnalyticsView />
        </Tabs.Content>

        <Tabs.Content value="overview">

      {/* Ozet kartlar */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card label="Toplam Değer">
          <span className="font-mono text-2xl font-semibold text-bn-txt">{formatNum(equity, 2)}</span>
          <span className="ml-1 text-sm text-bn-sub">USDT</span>
        </Card>
        <Card label="Toplam PNL">
          <span className={`font-mono text-2xl font-semibold ${pnlUp ? 'text-bn-up' : 'text-bn-down'}`}>
            {pnlUp ? '+' : ''}
            {formatNum(totalPnl, 2)}
          </span>
          <span className={`ml-2 text-sm ${pnlUp ? 'text-bn-up' : 'text-bn-down'}`}>
            ({pnlUp ? '+' : ''}
            {pnlPct.toFixed(2)}%)
          </span>
        </Card>
        <Card label="Kullanılabilir Bakiye">
          <span className="font-mono text-2xl font-semibold text-bn-txt">{formatNum(usdt, 2)}</span>
          <span className="ml-1 text-sm text-bn-sub">USDT</span>
        </Card>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Dagilim donut */}
        <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
          <p className="mb-2 text-sm font-medium text-bn-txt">Varlık Dağılımı</p>
          {allocation.length === 0 ? (
            <p className="py-10 text-center text-sm text-bn-sub">Veri yok</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                      {allocation.map((_, i) => (
                        <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${formatNum(Number(v), 2)} USDT`, '']}
                      contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#EAECEF' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {allocation.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-bn-txt">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                      {s.name}
                    </span>
                    <span className="font-mono text-bn-sub">{((s.value / equity) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pozisyonlar */}
        <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
          <p className="mb-2 text-sm font-medium text-bn-txt">Pozisyonlar</p>
          {enriched.length === 0 ? (
            <p className="py-10 text-center text-sm text-bn-sub">Açık pozisyon yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-bn-sub">
                    <th className="py-1.5 font-medium">Varlık</th>
                    <th className="py-1.5 text-right font-medium">Miktar</th>
                    <th className="py-1.5 text-right font-medium">Ort. Maliyet</th>
                    <th className="py-1.5 text-right font-medium">Son</th>
                    <th className="py-1.5 text-right font-medium">Değer</th>
                    <th className="py-1.5 text-right font-medium">PNL</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((p) => {
                    const up = (p.pnl ?? 0) >= 0
                    const sym = `${p.asset}USDT`
                    return (
                      <tr key={p.asset} className="border-t border-bn-line/50">
                        <td className="py-1.5 font-medium text-bn-txt">{p.asset}</td>
                        <td className="py-1.5 text-right font-mono text-bn-txt">{fmtQty(sym, p.qty)}</td>
                        <td className="py-1.5 text-right font-mono text-bn-sub">{fmtPrice(sym, p.avgPrice)}</td>
                        <td className="py-1.5 text-right font-mono text-bn-txt">
                          {p.currentPrice != null ? fmtPrice(sym, p.currentPrice) : '—'}
                        </td>
                        <td className="py-1.5 text-right font-mono text-bn-sub">
                          {p.value != null ? formatNum(p.value, 2) : '—'}
                        </td>
                        <td className={`py-1.5 text-right font-mono ${up ? 'text-bn-up' : 'text-bn-down'}`}>
                          {p.pnl != null
                            ? `${up ? '+' : ''}${formatNum(p.pnl, 2)} (${p.pnlPct! >= 0 ? '+' : ''}${p.pnlPct!.toFixed(2)}%)`
                            : '—'}
                        </td>
                        <td className="py-1.5 text-right">
                          <button
                            onClick={() => openTrade(p.asset)}
                            className="rounded border border-bn-line px-2 py-0.5 text-xs text-bn-gold transition hover:bg-bn-gold hover:text-bn-bg"
                          >
                            İşlem
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Islem gecmisi */}
      <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
        <p className="mb-2 text-sm font-medium text-bn-txt">İşlem Geçmişi</p>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-bn-sub">Henüz işlem yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-bn-sub">
                  <th className="py-1.5 font-medium">Tarih</th>
                  <th className="py-1.5 font-medium">Çift</th>
                  <th className="py-1.5 font-medium">Yön</th>
                  <th className="py-1.5 font-medium">Tür</th>
                  <th className="py-1.5 text-right font-medium">Fiyat</th>
                  <th className="py-1.5 text-right font-medium">Miktar</th>
                  <th className="py-1.5 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.id} className="border-t border-bn-line/50">
                    <td className="py-1.5 text-bn-sub">
                      {new Date(o.filledAt ?? o.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-1.5 font-medium text-bn-txt">{o.symbol}</td>
                    <td className={`py-1.5 ${o.side === 'BUY' ? 'text-bn-up' : 'text-bn-down'}`}>
                      {o.side === 'BUY' ? 'AL' : 'SAT'}
                    </td>
                    <td className="py-1.5 text-bn-sub">{o.type === 'MARKET' ? 'Piyasa' : 'Limit'}</td>
                    <td className="py-1.5 text-right font-mono text-bn-txt">
                      {o.fillPrice != null ? fmtPrice(o.symbol, o.fillPrice) : o.price != null ? fmtPrice(o.symbol, o.price) : '—'}
                    </td>
                    <td className="py-1.5 text-right font-mono text-bn-txt">{fmtQty(o.symbol, o.qty)}</td>
                    <td className="py-1.5">
                      <span className={o.status === 'FILLED' ? 'text-bn-up' : 'text-bn-sub'}>
                        {o.status === 'FILLED' ? 'Doldu' : 'İptal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
      <p className="mb-1 text-xs text-bn-sub">{label}</p>
      <p className="flex items-baseline">{children}</p>
    </div>
  )
}
