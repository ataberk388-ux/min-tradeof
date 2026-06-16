import { useState } from 'react'
import { LayoutGrid, X } from 'lucide-react'
import { useMarketTickers } from '@/hooks/useMarketTickers'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'

function tileColor(pct: number): string {
  const mag = Math.min(Math.abs(pct) / 8, 1) // %8 = tam doygunluk
  const alpha = 0.18 + mag * 0.6
  return pct >= 0 ? `rgba(14,203,129,${alpha})` : `rgba(246,70,93,${alpha})`
}

/** Topbar dugmesi + piyasa isi haritasi overlay'i. */
export function HeatmapButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-bn-sub transition hover:bg-bn-line hover:text-bn-txt"
        title="Piyasa ısı haritası"
        aria-label="Isı haritası"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      {open && <HeatmapOverlay onClose={() => setOpen(false)} />}
    </>
  )
}

function HeatmapOverlay({ onClose }: { onClose: () => void }) {
  const { data } = useMarketTickers()
  const { setSymbol } = useActiveSymbol()
  const coins = (data ?? []).slice(0, 72)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-x-2 bottom-2 top-8 mx-auto flex max-w-4xl flex-col overflow-hidden rounded-lg border border-bn-line bg-bn-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bn-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-bn-txt">Piyasa Isı Haritası · 24s</h2>
          <button onClick={onClose} className="text-bn-sub transition hover:text-bn-txt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 lg:grid-cols-8">
            {coins.map((c) => {
              const up = c.priceChangePercent >= 0
              return (
                <button
                  key={c.symbol}
                  onClick={() => {
                    setSymbol(c.symbol)
                    onClose()
                  }}
                  style={{ backgroundColor: tileColor(c.priceChangePercent) }}
                  className="flex aspect-square flex-col items-center justify-center rounded p-1 text-center transition hover:brightness-110"
                >
                  <span className="text-xs font-semibold text-white drop-shadow">
                    {c.symbol.replace(/USDT$/, '')}
                  </span>
                  <span className="text-[10px] font-medium text-white/90 drop-shadow">
                    {up ? '+' : ''}
                    {c.priceChangePercent.toFixed(1)}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
