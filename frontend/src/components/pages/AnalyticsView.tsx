import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTradeAnalytics, type RealizedTrade } from '@/hooks/useTradeAnalytics'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'
import { useEquityHistory } from '@/hooks/useEquityHistory'
import { formatNum, formatCompact } from '@/lib/format'
import { fmtPrice } from '@/lib/symbolFormat'

const TT_STYLE = { background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, fontSize: 12 }

/** Portfoy "Analiz" sekmesi: equity egrisi + gerceklesmis PNL metrikleri (Binance PNL analizi esinli). */
export function AnalyticsView() {
  const a = useTradeAnalytics()
  const { equity } = usePortfolioValue()
  const history = useEquityHistory(equity)

  const realizedUp = a.realizedPnl >= 0
  const equityData = history.map((p) => ({ t: p.t, v: p.v }))

  return (
    <div className="space-y-4">
      {/* Metrik kartlari */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Gerçekleşmiş PNL" value={`${realizedUp ? '+' : ''}${formatNum(a.realizedPnl, 2)}`} tone={realizedUp ? 'up' : 'down'} sub="USDT" />
        <Metric
          label="Kazanma Oranı"
          value={a.winRate != null ? `${a.winRate.toFixed(0)}%` : '—'}
          sub={`${a.wins}K / ${a.losses}Z`}
        />
        <Metric label="Toplam İşlem" value={String(a.filledCount)} sub={`${a.buyCount} al · ${a.sellCount} sat`} />
        <Metric label="İşlem Hacmi" value={`$${formatCompact(a.volumeUsdt)}`} sub="doldurulan" />
      </div>

      {/* Equity egrisi */}
      <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
        <p className="mb-2 text-sm font-medium text-bn-txt">Portföy Değeri (equity)</p>
        {equityData.length < 2 ? (
          <p className="py-12 text-center text-sm text-bn-sub">Equity grafiği için veri birikiyor (~15 sn'de bir örnekleniyor)…</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0B90B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} tick={{ fill: '#848E9C', fontSize: 11 }} minTickGap={40} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#848E9C', fontSize: 11 }} width={56} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip
                  contentStyle={TT_STYLE}
                  labelFormatter={(t) => new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                  formatter={(v) => [`${formatNum(Number(v), 2)} USDT`, 'Değer']}
                />
                <Area type="monotone" dataKey="v" stroke="#F0B90B" strokeWidth={2} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gunluk PNL */}
        <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
          <p className="mb-2 text-sm font-medium text-bn-txt">Günlük Gerçekleşen PNL</p>
          {a.daily.length === 0 ? (
            <p className="py-12 text-center text-sm text-bn-sub">Henüz kapanan işlem yok</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.daily}>
                  <XAxis dataKey="date" tick={{ fill: '#848E9C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#848E9C', fontSize: 11 }} width={48} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip contentStyle={TT_STYLE} formatter={(v) => [`${formatNum(Number(v), 2)} USDT`, 'PNL']} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {a.daily.map((d, i) => (
                      <Cell key={i} fill={d.pnl >= 0 ? '#0ECB81' : '#F6465D'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* En iyi / kotu + son islemler */}
        <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
          <p className="mb-2 text-sm font-medium text-bn-txt">En İyi / En Kötü İşlem</p>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <TradeBadge label="En iyi" trade={a.best} tone="up" />
            <TradeBadge label="En kötü" trade={a.worst} tone="down" />
          </div>
          <p className="mb-1 text-xs uppercase tracking-wide text-bn-sub">Son Kapanan İşlemler</p>
          {a.trades.length === 0 ? (
            <p className="py-4 text-center text-xs text-bn-sub">Kayıt yok</p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {a.trades.slice(0, 12).map((t, i) => {
                const up = t.realized >= 0
                return (
                  <div key={i} className="flex items-center justify-between rounded border border-bn-line bg-bn-panel2 px-2 py-1 text-xs">
                    <span className="font-medium text-bn-txt">{t.symbol}</span>
                    <span className={`font-mono ${up ? 'text-bn-up' : 'text-bn-down'}`}>
                      {up ? '+' : ''}{formatNum(t.realized, 2)} ({up ? '+' : ''}{t.pct.toFixed(1)}%)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-bn-up' : tone === 'down' ? 'text-bn-down' : 'text-bn-txt'
  return (
    <div className="rounded-lg border border-bn-line bg-bn-panel p-4">
      <p className="mb-1 text-xs text-bn-sub">{label}</p>
      <p className={`font-mono text-xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-bn-sub">{sub}</p>}
    </div>
  )
}

function TradeBadge({ label, trade, tone }: { label: string; trade: RealizedTrade | null; tone: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-bn-up' : 'text-bn-down'
  return (
    <div className="rounded-md border border-bn-line bg-bn-panel2 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-bn-sub">{label}</p>
      {trade ? (
        <>
          <p className="text-sm font-medium text-bn-txt">{trade.symbol}</p>
          <p className={`font-mono text-sm ${color}`}>
            {trade.realized >= 0 ? '+' : ''}{formatNum(trade.realized, 2)} ({trade.pct >= 0 ? '+' : ''}{trade.pct.toFixed(1)}%)
          </p>
          <p className="text-[10px] text-bn-sub">{fmtPrice(trade.symbol, trade.qty)} adet</p>
        </>
      ) : (
        <p className="text-sm text-bn-sub">—</p>
      )}
    </div>
  )
}
