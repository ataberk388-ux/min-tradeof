import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDownUp, X } from 'lucide-react'
import { fetchPrices } from '@/lib/binance'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { usePlaceOrder, usePortfolio } from '@/hooks/usePaper'
import { pushNotification } from '@/hooks/useNotifications'
import { formatNum } from '@/lib/format'
import { fmtQty } from '@/lib/symbolFormat'
import type { ApiError } from '@/lib/api'

/**
 * Binance "Convert" esinli hizli takas (paper): From -> To tek ekranda piyasa fiyatindan.
 * Backend yalniz X/USDT emir kabul ettigi icin cevrim iki piyasa emrine cevrilir:
 * From!=USDT ise SELL From->USDT, ardindan To!=USDT ise BUY To.
 */
export function ConvertModal({ onClose }: { onClose: () => void }) {
  const { data: portfolio } = usePortfolio()
  const { data: tickers } = useMarketTickers()
  const place = usePlaceOrder()

  const [from, setFrom] = useState('USDT')
  const [to, setTo] = useState('BTC')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  // From secenekleri: USDT + elde tutulan varliklar. To: hacme gore tum baz varliklar.
  const fromAssets = useMemo(() => {
    const held = (portfolio?.positions ?? []).map((p) => p.asset)
    return ['USDT', ...held]
  }, [portfolio])

  const toAssets = useMemo(
    () => (tickers ?? []).map((t) => t.symbol.replace(/USDT$/, '')).slice(0, 80),
    [tickers],
  )

  // Cevrimde gereken iki tarafin canli fiyati.
  const priceSymbols = [from, to].filter((a) => a !== 'USDT').map((a) => `${a}USDT`)
  const { data: prices } = useQuery({
    queryKey: ['binance', 'convert-prices', [...new Set(priceSymbols)].sort().join(',')],
    queryFn: () => fetchPrices([...new Set(priceSymbols)]),
    enabled: priceSymbols.length > 0,
    refetchInterval: 4000,
  })

  const fromPrice = from === 'USDT' ? 1 : prices?.[`${from}USDT`] ?? null
  const toPrice = to === 'USDT' ? 1 : prices?.[`${to}USDT`] ?? null

  const available =
    from === 'USDT'
      ? portfolio?.usdtBalance ?? 0
      : portfolio?.positions.find((p) => p.asset === from)?.qty ?? 0

  const amt = Number(amount) || 0
  const usdtValue = fromPrice != null ? amt * fromPrice : 0
  const receive = toPrice != null && toPrice > 0 ? usdtValue / toPrice : 0
  const canConvert =
    from !== to && amt > 0 && amt <= available + 1e-9 && fromPrice != null && toPrice != null && !busy

  const swap = () => {
    setFrom(to)
    setTo(from)
    setAmount('')
  }

  const doConvert = async () => {
    if (!canConvert) return
    setBusy(true)
    try {
      if (from !== 'USDT') {
        await place.mutateAsync({ symbol: `${from}USDT`, side: 'SELL', type: 'MARKET', qty: amt })
      }
      if (to !== 'USDT') {
        await place.mutateAsync({ symbol: `${to}USDT`, side: 'BUY', type: 'MARKET', qty: receive })
      }
      toast.success(`${fmtQty(`${from}USDT`, amt)} ${from} → ${fmtQty(`${to}USDT`, receive)} ${to}`)
      pushNotification(`Çevrildi: ${from} → ${to}`)
      setAmount('')
      onClose()
    } catch (err) {
      toast.error((err as unknown as ApiError).message ?? 'Çevirme başarısız')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-bn-line bg-bn-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-bn-txt">Hızlı Çevir</h2>
          <button onClick={onClose} className="text-bn-sub transition hover:text-bn-txt" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* From */}
        <div className="rounded-lg border border-bn-line bg-bn-panel2 p-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-bn-sub">
            <span>Gönder</span>
            <span>
              Bakiye: {formatNum(available, from === 'USDT' ? 2 : 6)} {from}
              <button onClick={() => setAmount(String(available))} className="ml-1.5 text-bn-gold hover:underline">
                Maks
              </button>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent text-lg font-mono text-bn-txt outline-none placeholder:text-bn-sub"
            />
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-bn-line bg-bn-panel px-2 py-1.5 text-sm font-medium text-bn-txt outline-none"
            >
              {fromAssets.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap */}
        <div className="my-2 flex justify-center">
          <button onClick={swap} className="rounded-full border border-bn-line bg-bn-panel2 p-1.5 text-bn-sub transition hover:text-bn-gold" aria-label="Yön değiştir">
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* To */}
        <div className="rounded-lg border border-bn-line bg-bn-panel2 p-3">
          <p className="mb-1 text-[11px] text-bn-sub">Al (tahmini)</p>
          <div className="flex items-center gap-2">
            <span className="w-full truncate text-lg font-mono text-bn-txt">
              {receive > 0 ? fmtQty(`${to}USDT`, receive) : '0.00'}
            </span>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-bn-line bg-bn-panel px-2 py-1.5 text-sm font-medium text-bn-txt outline-none"
            >
              {['USDT', ...toAssets].filter((a, i, arr) => arr.indexOf(a) === i).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-bn-sub">
          {fromPrice != null && toPrice != null && from !== to
            ? `1 ${from} ≈ ${formatNum(fromPrice / toPrice, 6)} ${to} · ≈ $${formatNum(usdtValue, 2)}`
            : 'Fiyat alınıyor…'}
        </p>

        <button
          onClick={doConvert}
          disabled={!canConvert}
          className="mt-4 w-full rounded-md bg-bn-gold py-2.5 text-sm font-semibold text-bn-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Çevriliyor…' : from === to ? 'Farklı varlık seç' : amt > available ? 'Yetersiz bakiye' : 'Çevir'}
        </button>
      </div>
    </div>
  )
}
