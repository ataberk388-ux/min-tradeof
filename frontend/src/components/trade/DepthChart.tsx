import { type DepthLevel, type DepthSnapshot } from '@/lib/binance'
import { fmtPrice } from '@/lib/symbolFormat'

/** Order book derinlik egrisi: kumulatif alis (yesil) / satis (kirmizi) alanlari. */
export function DepthChart({ depth, symbol }: { depth: DepthSnapshot; symbol: string }) {
  const bids = cumulative(depth.bids) // fiyat azalan
  const asks = cumulative(depth.asks) // fiyat artan

  if (bids.length < 2 || asks.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-bn-sub">
        Derinlik yükleniyor…
      </div>
    )
  }

  const W = 300
  const H = 200
  const maxTotal = Math.max(bids[bids.length - 1].total, asks[asks.length - 1].total, 1)
  const priceMin = bids[bids.length - 1].price
  const priceMax = asks[asks.length - 1].price
  const span = priceMax - priceMin || 1
  const X = (p: number) => ((p - priceMin) / span) * W
  const Y = (t: number) => H - (t / maxTotal) * H

  const bidsAsc = [...bids].reverse()
  const bidLine = bidsAsc.map((b) => `${X(b.price)},${Y(b.total)}`).join(' ')
  const bidArea = `${X(bidsAsc[0].price)},${H} ${bidLine} ${X(bidsAsc[bidsAsc.length - 1].price)},${H}`
  const askLine = asks.map((a) => `${X(a.price)},${Y(a.total)}`).join(' ')
  const askArea = `${X(asks[0].price)},${H} ${askLine} ${X(asks[asks.length - 1].price)},${H}`

  return (
    <div className="flex h-full flex-col p-2">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="min-h-0 flex-1">
        <polygon points={bidArea} fill="rgba(14,203,129,0.15)" stroke="#0ECB81" strokeWidth={1} />
        <polygon points={askArea} fill="rgba(246,70,93,0.15)" stroke="#F6465D" strokeWidth={1} />
      </svg>
      <div className="flex justify-between px-1 pt-1 font-mono text-[10px] text-bn-sub">
        <span>{fmtPrice(symbol, priceMin)}</span>
        <span>{fmtPrice(symbol, asks[0].price)}</span>
        <span>{fmtPrice(symbol, priceMax)}</span>
      </div>
    </div>
  )
}

function cumulative(levels: DepthLevel[]): { price: number; total: number }[] {
  let running = 0
  return levels.map((l) => {
    running += l.qty
    return { price: l.price, total: running }
  })
}
