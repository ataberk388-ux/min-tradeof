import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { useResetPaper } from '@/hooks/usePaper'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'
import { useEquityHistory } from '@/hooks/useEquityHistory'
import { formatNum } from '@/lib/format'
import { fmtPrice, fmtQty } from '@/lib/symbolFormat'

export function BalancePanel() {
  const { usdt, enriched, equity, totalPnl } = usePortfolioValue()
  const equityHistory = useEquityHistory(equity)
  const reset = useResetPaper()

  const onReset = () => {
    reset.mutate(undefined, {
      onSuccess: () => toast.success('Paper hesap sıfırlandı (10.000 USDT)'),
    })
  }

  const pnlUp = totalPnl >= 0

  return (
    <div className="flex h-full flex-col bg-bn-panel">
      <div className="flex items-center justify-between border-b border-bn-line px-3 py-1.5">
        <span className="text-xs font-medium text-bn-txt">Portföy</span>
        <button
          onClick={onReset}
          disabled={reset.isPending}
          className="flex items-center gap-1 text-[11px] text-bn-sub transition hover:text-bn-gold disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          Sıfırla
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] text-bn-sub">Toplam Değer (USDT)</p>
            <p className="font-mono text-lg font-semibold text-bn-txt">{formatNum(equity, 2)}</p>
          </div>
          <div>
            <p className="text-[11px] text-bn-sub">Toplam PNL</p>
            <p className={`font-mono text-lg font-semibold ${pnlUp ? 'text-bn-up' : 'text-bn-down'}`}>
              {pnlUp ? '+' : ''}
              {formatNum(totalPnl, 2)}
            </p>
          </div>
        </div>
        <p className="mb-2 text-[11px] text-bn-sub">
          Kullanılabilir: <span className="font-mono text-bn-txt">{formatNum(usdt, 2)} USDT</span>
        </p>

        <EquityChart points={equityHistory} up={pnlUp} />


        {enriched.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-bn-sub">Pozisyonlar</p>
            <div className="space-y-1">
              {enriched.map((p) => {
                const up = (p.pnl ?? 0) >= 0
                return (
                  <div
                    key={p.asset}
                    className="rounded border border-bn-line bg-bn-panel2 px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-bn-txt">{p.asset}</span>
                      <span className={`font-mono ${up ? 'text-bn-up' : 'text-bn-down'}`}>
                        {p.pnl != null
                          ? `${up ? '+' : ''}${formatNum(p.pnl, 2)} (${p.pnlPct! >= 0 ? '+' : ''}${p.pnlPct!.toFixed(2)}%)`
                          : '—'}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[10px] text-bn-sub">
                      <span>
                        {fmtQty(`${p.asset}USDT`, p.qty)} @ {fmtPrice(`${p.asset}USDT`, p.avgPrice)}
                      </span>
                      <span>≈ {p.value != null ? formatNum(p.value, 2) : '—'} USDT</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-bn-sub">Açık pozisyon yok</p>
        )}
      </div>
    </div>
  )
}

/** Toplam portfoy degerinin zaman icindeki mini alan grafigi. */
function EquityChart({ points, up }: { points: { t: number; v: number }[]; up: boolean }) {
  const W = 240
  const H = 40
  if (points.length < 2) {
    return (
      <div className="mb-3 flex h-10 items-center justify-center rounded border border-bn-line bg-bn-panel2 text-[10px] text-bn-sub">
        Equity grafiği için veri birikiyor…
      </div>
    )
  }
  const vals = points.map((p) => p.v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const X = (i: number) => (i / (points.length - 1)) * W
  const Y = (v: number) => H - ((v - min) / range) * H
  const line = points.map((p, i) => `${X(i)},${Y(p.v)}`).join(' ')
  const area = `${X(0)},${H} ${line} ${X(points.length - 1)},${H}`
  const color = up ? '#0ECB81' : '#F6465D'

  return (
    <div className="mb-3">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10 w-full">
        <polygon points={area} fill={up ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'} />
        <polyline points={line} fill="none" stroke={color} strokeWidth={1} />
      </svg>
    </div>
  )
}
