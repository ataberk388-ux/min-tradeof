import { useEffect, useMemo, useRef, useState } from 'react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { Input } from '@/components/ui/input'
import { fmtPrice } from '@/lib/symbolFormat'

/**
 * Sembol secici (otomatik tamamlama): yazdikca eslesen USDT pariteleri oneri olarak listelenir;
 * tikla -> sec. Serbest yazmaya da izin verir (deger her zaman buyuk harfe cevrilir).
 */
export function SymbolCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (symbol: string) => void
}) {
  const { data } = useMarketTickers()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const options = useMemo(() => {
    const q = value.toUpperCase()
    const list = data ?? []
    return (q ? list.filter((t) => t.symbol.includes(q)) : list).slice(0, 8)
  }, [data, value])

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase())
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Ara: BTC, ETH, SOL…"
        autoComplete="off"
      />
      {open && options.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-bn-line bg-bn-panel shadow-xl">
          {options.map((t) => {
            const base = t.symbol.replace(/USDT$/, '')
            const up = t.priceChangePercent >= 0
            return (
              <button
                key={t.symbol}
                type="button"
                onClick={() => {
                  onChange(t.symbol)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-bn-line/50"
              >
                <CoinIcon asset={base} size={18} />
                <span className="font-medium text-bn-txt">{base}</span>
                <span className="text-bn-sub">/USDT</span>
                <span className="ml-auto font-mono tabular-nums text-bn-txt">
                  {fmtPrice(t.symbol, t.lastPrice)}
                </span>
                <span className={`w-12 text-right font-mono tabular-nums ${up ? 'text-bn-up' : 'text-bn-down'}`}>
                  {up ? '+' : ''}
                  {t.priceChangePercent.toFixed(1)}%
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
