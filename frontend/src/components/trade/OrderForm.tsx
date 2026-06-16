import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { closeWs, openTickerStream } from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useOrderTicket } from '@/hooks/useOrderTicket'
import { pushNotification } from '@/hooks/useNotifications'
import { useFillOrder, usePaperOrders, usePlaceOrder, usePortfolio } from '@/hooks/usePaper'
import { addConditional } from '@/hooks/useConditionalOrders'
import { formatNum } from '@/lib/format'
import { fmtPrice, fmtQty } from '@/lib/symbolFormat'
import type { ApiError } from '@/lib/api'
import type { OrderSide } from '@/lib/paper'

/** Emir formu modlari: paper backend (Piyasa/Limit) + client-side koşullu (Stop-Limit/OCO). */
type FormMode = 'MARKET' | 'LIMIT' | 'STOP_LIMIT' | 'OCO'
const MODES: { key: FormMode; label: string }[] = [
  { key: 'MARKET', label: 'Piyasa' },
  { key: 'LIMIT', label: 'Limit' },
  { key: 'STOP_LIMIT', label: 'Stop-Limit' },
  { key: 'OCO', label: 'OCO' },
]

export function OrderForm() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const asset = symbol.replace(/USDT$/, '')

  const [side, setSide] = useState<OrderSide>('BUY')
  const [mode, setMode] = useState<FormMode>('MARKET')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [qty, setQty] = useState('')
  const [totalInput, setTotalInput] = useState('')
  const [amountMode, setAmountMode] = useState<'qty' | 'total'>('qty')
  const [livePrice, setLivePrice] = useState<number | null>(null)

  const { ticket } = useOrderTicket()
  const { data: portfolio } = usePortfolio()
  const { data: orders } = usePaperOrders()
  const place = usePlaceOrder()
  const fill = useFillOrder()

  // Order book'tan fiyata tiklayinca: limit moduna gec + fiyati doldur
  useEffect(() => {
    if (ticket) {
      setMode('LIMIT')
      setPrice(String(ticket.price))
    }
  }, [ticket])

  // Aktif sembolun canli fiyati
  useEffect(() => {
    setLivePrice(null)
    const ws = openTickerStream(symbol, (t) => setLivePrice(t.last))
    return () => closeWs(ws)
  }, [symbol])

  // Limit otomatik dolum: aktif sembolde fiyat hedefe ulasinca acik limit emirleri dolar.
  // firedRef: ayni emri (invalidate gecikmesinde) tekrar tetiklemeyi onler.
  const firedRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (livePrice == null || !orders) return
    for (const o of orders) {
      if (o.status !== 'OPEN' || o.type !== 'LIMIT' || o.symbol !== symbol || o.price == null) continue
      const crossed = o.side === 'BUY' ? livePrice <= o.price : livePrice >= o.price
      if (crossed && !firedRef.current.has(o.id)) {
        firedRef.current.add(o.id)
        fill.mutate(o.id)
      }
    }
  }, [livePrice, orders, symbol, fill])

  const usdt = portfolio?.usdtBalance ?? 0
  const position = portfolio?.positions.find((p) => p.asset === asset)
  const posQty = position?.qty ?? 0
  const usesLimitPrice = mode === 'LIMIT' || mode === 'STOP_LIMIT'
  const effectivePrice = usesLimitPrice ? Number(price) || livePrice || 0 : livePrice || 0
  const isConditional = mode === 'STOP_LIMIT' || mode === 'OCO'

  // Miktar (base varlik) ya da Tutar (USDT) ile gir
  const submitQty =
    amountMode === 'qty'
      ? Number(qty) || 0
      : effectivePrice > 0
        ? (Number(totalInput) || 0) / effectivePrice
        : 0
  const totalDisplay =
    amountMode === 'qty' ? (Number(qty) || 0) * effectivePrice : Number(totalInput) || 0

  const setPercent = (pct: number) => {
    if (amountMode === 'qty') {
      if (side === 'BUY') {
        if (effectivePrice > 0) setQty(((usdt * pct) / effectivePrice).toFixed(6))
      } else {
        setQty((posQty * pct).toFixed(6))
      }
    } else {
      if (side === 'BUY') setTotalInput((usdt * pct).toFixed(2))
      else setTotalInput((posQty * pct * effectivePrice).toFixed(2))
    }
  }

  const resetInputs = () => {
    setQty('')
    setTotalInput('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!submitQty || submitQty <= 0) {
      toast.error('Geçerli miktar/tutar gir')
      return
    }
    if (usesLimitPrice && (!Number(price) || Number(price) <= 0)) {
      toast.error('Limit fiyatı gir')
      return
    }

    // Koşullu emirler: backend'e gitmez, tetiklenince LIMIT'e doner (client watcher).
    if (mode === 'STOP_LIMIT') {
      if (!Number(stopPrice)) {
        toast.error('Stop (tetik) fiyatı gir')
        return
      }
      addConditional({ symbol, side, kind: 'STOP_LIMIT', qty: submitQty, stopPrice: Number(stopPrice), limitPrice: Number(price) })
      toast.success(`Stop-Limit emri kuruldu: ${asset}`)
      pushNotification(`Stop-Limit kuruldu: ${asset}`)
      resetInputs()
      return
    }
    if (mode === 'OCO') {
      if (!Number(tpPrice) || !Number(stopPrice) || !Number(price)) {
        toast.error('OCO için TP / Stop / Stop-Limit fiyatlarını gir')
        return
      }
      addConditional({
        symbol,
        side,
        kind: 'OCO',
        qty: submitQty,
        tpPrice: Number(tpPrice),
        stopPrice: Number(stopPrice),
        limitPrice: Number(price),
      })
      toast.success(`OCO emri kuruldu: ${asset}`)
      pushNotification(`OCO kuruldu: ${asset}`)
      resetInputs()
      return
    }

    place.mutate(
      { symbol, side, type: mode, qty: submitQty, price: mode === 'LIMIT' ? Number(price) : undefined },
      {
        onSuccess: () => {
          const label = side === 'BUY' ? 'alış' : 'satış'
          toast.success(`${asset} ${label} emri verildi`)
          pushNotification(`${mode === 'LIMIT' ? 'Limit' : 'Piyasa'} ${label}: ${asset}`)
          resetInputs()
        },
        onError: (err) => toast.error((err as unknown as ApiError).message ?? 'Emir başarısız'),
      },
    )
  }

  const isBuy = side === 'BUY'

  return (
    <div className="flex h-full flex-col bg-bn-panel p-3">
      {/* Al / Sat */}
      <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-md border border-bn-line">
        <button
          onClick={() => setSide('BUY')}
          className={`flex items-center justify-center gap-1.5 py-1.5 text-sm font-semibold transition ${
            isBuy ? 'bg-bn-up text-bn-bg' : 'bg-bn-panel2 text-bn-sub hover:text-bn-up'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Al
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={`flex items-center justify-center gap-1.5 py-1.5 text-sm font-semibold transition ${
            !isBuy ? 'bg-bn-down text-white' : 'bg-bn-panel2 text-bn-sub hover:text-bn-down'
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          Sat
        </button>
      </div>

      {/* Emir turu: Piyasa / Limit / Stop-Limit / OCO */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`transition ${mode === m.key ? 'font-semibold text-bn-gold' : 'text-bn-sub hover:text-bn-txt'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <div className="mb-1 text-[11px] text-bn-sub">
          Kullanılabilir: <span className="text-bn-txt">{formatNum(usdt, 2)} USDT</span>
          {!isBuy && (
            <span className="ml-2">
              · {fmtQty(symbol, posQty)} {asset}
            </span>
          )}
        </div>

        {/* Fiyat(lar) — moda gore */}
        {mode === 'MARKET' && (
          <Field label="Fiyat (USDT)">
            <div className="flex items-center justify-between rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 text-sm text-bn-sub">
              <span>Piyasa</span>
              <span className="font-mono text-bn-txt">
                {livePrice != null ? fmtPrice(symbol, livePrice) : '—'}
              </span>
            </div>
          </Field>
        )}

        {mode === 'OCO' && (
          <Field label="Take-Profit fiyatı (USDT)">
            <PriceInput value={tpPrice} onChange={setTpPrice} placeholder={livePrice != null ? fmtPrice(symbol, livePrice) : '0.00'} />
          </Field>
        )}

        {isConditional && (
          <Field label="Stop / tetik fiyatı (USDT)">
            <PriceInput value={stopPrice} onChange={setStopPrice} placeholder={livePrice != null ? fmtPrice(symbol, livePrice) : '0.00'} />
          </Field>
        )}

        {usesLimitPrice && (
          <Field label={mode === 'STOP_LIMIT' ? 'Limit fiyatı (USDT)' : 'Fiyat (USDT)'}>
            <PriceInput value={price} onChange={setPrice} placeholder={livePrice != null ? fmtPrice(symbol, livePrice) : '0.00'} />
          </Field>
        )}
        {mode === 'OCO' && (
          <Field label="Limit fiyatı (stop tetiklenince) (USDT)">
            <PriceInput value={price} onChange={setPrice} placeholder={livePrice != null ? fmtPrice(symbol, livePrice) : '0.00'} />
          </Field>
        )}

        {/* Miktar / Tutar */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-bn-sub">
            {amountMode === 'qty' ? `Miktar (${asset})` : 'Tutar (USDT)'}
          </span>
          <div className="flex gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setAmountMode('qty')}
              className={amountMode === 'qty' ? 'text-bn-gold' : 'text-bn-sub hover:text-bn-txt'}
            >
              Miktar
            </button>
            <span className="text-bn-line">|</span>
            <button
              type="button"
              onClick={() => setAmountMode('total')}
              className={amountMode === 'total' ? 'text-bn-gold' : 'text-bn-sub hover:text-bn-txt'}
            >
              Tutar
            </button>
          </div>
        </div>
        <div className="mb-3">
          {amountMode === 'qty' ? (
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 text-sm text-bn-txt outline-none focus:border-bn-gold/50"
            />
          ) : (
            <input
              value={totalInput}
              onChange={(e) => setTotalInput(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 text-sm text-bn-txt outline-none focus:border-bn-gold/50"
            />
          )}
        </div>

        {/* Yuzde */}
        <div className="mb-3 grid grid-cols-4 gap-1">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPercent(p)}
              className="rounded border border-bn-line py-1 text-[11px] text-bn-sub transition hover:border-bn-gold/40 hover:text-bn-txt"
            >
              {p * 100}%
            </button>
          ))}
        </div>

        <div className="mb-3 flex justify-between text-xs text-bn-sub">
          {amountMode === 'qty' ? (
            <>
              <span>Tutar</span>
              <span className="font-mono text-bn-txt">{formatNum(totalDisplay, 2)} USDT</span>
            </>
          ) : (
            <>
              <span>Miktar</span>
              <span className="font-mono text-bn-txt">
                {fmtQty(symbol, submitQty)} {asset}
              </span>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={place.isPending}
          className={`mt-auto flex items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            isBuy ? 'bg-bn-up text-bn-bg hover:opacity-90' : 'bg-bn-down text-white hover:opacity-90'
          }`}
        >
          {isBuy ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {isConditional
            ? `${mode === 'OCO' ? 'OCO' : 'Stop-Limit'} kur (${isBuy ? 'Al' : 'Sat'})`
            : isBuy
              ? `Al ${asset}`
              : `Sat ${asset}`}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] text-bn-sub">{label}</span>
      {children}
    </label>
  )
}

function PriceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="decimal"
      placeholder={placeholder}
      className="w-full rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 text-sm text-bn-txt outline-none focus:border-bn-gold/50"
    />
  )
}
