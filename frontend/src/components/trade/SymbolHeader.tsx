import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { closeWs, openTickerStream, type SymbolTicker } from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useSignal } from '@/hooks/useSignal'
import { formatCompact } from '@/lib/format'
import { fmtPrice } from '@/lib/symbolFormat'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { CoinInfoPanel } from '@/components/trade/CoinInfoPanel'

/** Secili cift basligi: canli son fiyat + Binance spot tarzi 24s istatistik seridi. */
export function SymbolHeader() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const [t, setT] = useState<SymbolTicker | null>(null)
  const [live, setLive] = useState(false)
  const [flash, setFlash] = useState('')
  const prevPrice = useRef<number | null>(null)

  useEffect(() => {
    setT(null)
    setLive(false)
    prevPrice.current = null
    const ws = openTickerStream(symbol, setT)
    ws.addEventListener('open', () => setLive(true))
    ws.addEventListener('close', () => setLive(false))
    ws.addEventListener('error', () => setLive(false))
    return () => closeWs(ws)
  }, [symbol])

  // Son fiyat degisince kisa flash
  useEffect(() => {
    if (!t) return
    const p = t.last
    if (prevPrice.current != null && p !== prevPrice.current) {
      setFlash(p > prevPrice.current ? 'flash-up' : 'flash-down')
      const id = setTimeout(() => setFlash(''), 500)
      prevPrice.current = p
      return () => clearTimeout(id)
    }
    prevPrice.current = p
  }, [t])

  const signal = useSignal(symbol)
  const [infoOpen, setInfoOpen] = useState(false)
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
        <button
          onClick={() => setInfoOpen(true)}
          className="text-bn-sub transition hover:text-bn-gold"
          aria-label="Coin bilgisi"
          title="Coin bilgisi"
        >
          <Info className="h-4 w-4" />
        </button>
      </span>

      {infoOpen && <CoinInfoPanel asset={base} onClose={() => setInfoOpen(false)} />}

      <span className={`rounded px-1 font-mono text-xl font-semibold tabular-nums ${flash} ${changeColor}`}>
        {t ? fmtPrice(symbol, t.last) : '—'}
      </span>

      <span className="flex items-center gap-1 text-[10px] text-bn-sub">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-bn-up' : 'bg-bn-down'}`} />
        {live ? 'canlı' : 'bağlanıyor…'}
      </span>

      {signal && (
        <span
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            signal.label === 'AL'
              ? 'bg-bn-up/15 text-bn-up'
              : signal.label === 'SAT'
                ? 'bg-bn-down/15 text-bn-down'
                : 'bg-bn-line text-bn-sub'
          }`}
          title={`Teknik sinyal — al: ${signal.bullish}, sat: ${signal.bearish} (RSI+MACD+MA)`}
        >
          Sinyal: {signal.label}
        </span>
      )}

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
