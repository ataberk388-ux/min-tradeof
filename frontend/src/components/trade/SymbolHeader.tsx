import { useEffect, useState, type ReactNode } from 'react'
import { closeWs, openTickerStream, type SymbolTicker } from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { formatCompact } from '@/lib/format'
import { fmtPrice } from '@/lib/symbolFormat'
import { CoinIcon } from '@/components/trade/CoinIcon'

/** Secili cift basligi: canli son fiyat + Binance spot tarzi 24s istatistik seridi. */
export function SymbolHeader() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const [t, setT] = useState<SymbolTicker | null>(null)

  useEffect(() => {
    setT(null)
    const ws = openTickerStream(symbol, setT)
    return () => closeWs(ws)
  }, [symbol])

  const base = symbol.replace(/USDT$/, '')
  const up = (t?.changePercent ?? 0) >= 0
  const changeColor = up ? 'text-bn-up' : 'text-bn-down'

  // Tarayici sekme basliginda canli fiyat (Binance gibi)
  useEffect(() => {
    if (t) document.title = `${fmtPrice(symbol, t.last)} | ${base}/USDT`
    return () => {
      document.title = 'Crypto Alarm'
    }
  }, [t, symbol, base])

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-bn-line bg-bn-panel px-4 py-2">
      <span className="flex items-center gap-2 text-base font-semibold text-bn-txt">
        <CoinIcon asset={base} size={22} />
        {base}/USDT
      </span>

      <span className={`font-mono text-xl font-semibold tabular-nums ${changeColor}`}>
        {t ? fmtPrice(symbol, t.last) : '—'}
      </span>

      <Field label="24s Değişim">
        <span className={changeColor}>
          {t ? `${up ? '+' : ''}${fmtPrice(symbol, t.changeAbs)}  ${up ? '+' : ''}${t.changePercent.toFixed(2)}%` : '—'}
        </span>
      </Field>
      <Field label="24s Ort. Fiyat">{t ? fmtPrice(symbol, t.weightedAvg) : '—'}</Field>
      <Field label="24s Yüksek">{t ? fmtPrice(symbol, t.high) : '—'}</Field>
      <Field label="24s Düşük">{t ? fmtPrice(symbol, t.low) : '—'}</Field>
      <Field label={`24s Hacim(${base})`}>{t ? formatCompact(t.baseVolume) : '—'}</Field>
      <Field label="24s Hacim(USDT)">{t ? formatCompact(t.quoteVolume) : '—'}</Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-bn-sub">{label}</span>
      <span className="font-mono text-xs tabular-nums text-bn-txt">{children}</span>
    </div>
  )
}
