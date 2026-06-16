import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { closeWs, openTickerStream } from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useOrderTicket } from '@/hooks/useOrderTicket'
import { pushNotification } from '@/hooks/useNotifications'
import { useFillOrder, usePaperOrders, usePlaceOrder, usePortfolio } from '@/hooks/usePaper'
import { formatNum } from '@/lib/format'
import { fmtPrice, fmtQty } from '@/lib/symbolFormat'
import type { ApiError } from '@/lib/api'
import type { OrderSide, OrderType } from '@/lib/paper'

export function OrderForm() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const asset = symbol.replace(/USDT$/, '')

  const [side, setSide] = useState<OrderSide>('BUY')
  const [type, setType] = useState<OrderType>('MARKET')
  const [price, setPrice] = useState('')
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
      setType('LIMIT')
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
  const effectivePrice = type === 'LIMIT' ? Number(price) || livePrice || 0 : livePrice || 0

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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!submitQty || submitQty <= 0) {
      toast.error('Geçerli miktar/tutar gir')
      return
    }
    if (type === 'LIMIT' && (!Number(price) || Number(price) <= 0)) {
      toast.error('Limit fiyatı gir')
      return
    }
    place.mutate(
      { symbol, side, type, qty: submitQty, price: type === 'LIMIT' ? Number(price) : undefined },
      {
        onSuccess: () => {
          const label = side === 'BUY' ? 'alış' : 'satış'
          toast.success(`${asset} ${label} emri verildi`)
          pushNotification(`${type === 'LIMIT' ? 'Limit' : 'Piyasa'} ${label}: ${asset}`)
          setQty('')
          setTotalInput('')
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
          className={`py-1.5 text-sm font-semibold transition ${
            isBuy ? 'bg-bn-up text-bn-bg' : 'bg-bn-panel2 text-bn-sub'
          }`}
        >
          Al
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={`py-1.5 text-sm font-semibold transition ${
            !isBuy ? 'bg-bn-down text-white' : 'bg-bn-panel2 text-bn-sub'
          }`}
        >
          Sat
        </button>
      </div>

      {/* Market / Limit */}
      <div className="mb-3 flex gap-3 text-xs">
        {(['MARKET', 'LIMIT'] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`transition ${type === t ? 'font-semibold text-bn-gold' : 'text-bn-sub hover:text-bn-txt'}`}
          >
            {t === 'MARKET' ? 'Piyasa' : 'Limit'}
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

        {/* Fiyat */}
        <Field label="Fiyat (USDT)">
          {type === 'MARKET' ? (
            <div className="flex items-center justify-between rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 text-sm text-bn-sub">
              <span>Piyasa</span>
              <span className="font-mono text-bn-txt">
                {livePrice != null ? fmtPrice(symbol, livePrice) : '—'}
              </span>
            </div>
          ) : (
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder={livePrice != null ? fmtPrice(symbol, livePrice) : '0.00'}
              className="w-full rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 text-sm text-bn-txt outline-none focus:border-bn-gold/50"
            />
          )}
        </Field>

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
          className={`mt-auto rounded-md py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            isBuy ? 'bg-bn-up text-bn-bg hover:opacity-90' : 'bg-bn-down text-white hover:opacity-90'
          }`}
        >
          {isBuy ? `Al ${asset}` : `Sat ${asset}`}
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
