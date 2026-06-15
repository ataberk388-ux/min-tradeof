import { useEffect, useMemo, useState } from 'react'
import { closeWs, openDepthStream, type DepthLevel, type DepthSnapshot } from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useOrderTicket } from '@/hooks/useOrderTicket'
import { fmtPrice, fmtQty, priceDecimals } from '@/lib/symbolFormat'
import { DepthChart } from '@/components/trade/DepthChart'

const ROWS = 12

export function OrderBook() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const { fillPrice } = useOrderTicket()
  const [depth, setDepth] = useState<DepthSnapshot>({ bids: [], asks: [] })

  useEffect(() => {
    setDepth({ bids: [], asks: [] })
    let latest: DepthSnapshot | null = null
    let raf = 0
    const ws = openDepthStream(symbol, (d) => {
      latest = d
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0
          if (latest) setDepth(latest)
        })
      }
    })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      closeWs(ws)
    }
  }, [symbol])

  // Gruplama secenekleri: tickSize, x10, x100
  const baseTick = Math.pow(10, -priceDecimals(symbol, depth.asks[0]?.price))
  const groupOptions = useMemo(
    () => [baseTick, baseTick * 10, baseTick * 100],
    [baseTick],
  )
  const [group, setGroup] = useState<number | null>(null)
  const groupSize = group ?? baseTick
  const [view, setView] = useState<'book' | 'depth'>('book')

  const asks = useMemo(
    () => withCumulative(groupLevels(depth.asks, groupSize, true).slice(0, ROWS)),
    [depth.asks, groupSize],
  )
  const bids = useMemo(
    () => withCumulative(groupLevels(depth.bids, groupSize, false).slice(0, ROWS)),
    [depth.bids, groupSize],
  )
  const maxTotal = Math.max(asks.at(-1)?.total ?? 0, bids.at(-1)?.total ?? 0, 1)

  const bestAsk = depth.asks[0]?.price
  const bestBid = depth.bids[0]?.price
  const mid = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null
  const spreadPct = spread && mid ? (spread / mid) * 100 : null

  return (
    <div className="flex h-full flex-col bg-bn-panel">
      <div className="flex items-center justify-between border-b border-bn-line px-3 py-1.5">
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setView('book')}
            className={`transition ${view === 'book' ? 'font-medium text-bn-txt' : 'text-bn-sub hover:text-bn-txt'}`}
          >
            Defter
          </button>
          <button
            onClick={() => setView('depth')}
            className={`transition ${view === 'depth' ? 'font-medium text-bn-txt' : 'text-bn-sub hover:text-bn-txt'}`}
          >
            Derinlik
          </button>
        </div>
        {view === 'book' && (
          <select
            value={groupSize}
            onChange={(e) => setGroup(Number(e.target.value))}
            className="rounded border border-bn-line bg-bn-panel2 px-1 py-0.5 text-[10px] text-bn-sub outline-none"
          >
            {groupOptions.map((g) => (
              <option key={g} value={g} className="bg-bn-panel">
                {g >= 1 ? g : g.toFixed(priceDecimals(symbol, depth.asks[0]?.price))}
              </option>
            ))}
          </select>
        )}
      </div>

      {view === 'depth' ? (
        <DepthChart depth={depth} symbol={symbol} />
      ) : (
        <>
          <div className="grid grid-cols-3 px-3 py-1 text-[10px] uppercase tracking-wide text-bn-sub">
            <span>Fiyat</span>
            <span className="text-right">Miktar</span>
            <span className="text-right">Toplam</span>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex flex-col-reverse">
          {asks.map((lvl) => (
            <Row key={`a-${lvl.price}`} lvl={lvl} maxTotal={maxTotal} side="ask" symbol={symbol} onClick={() => fillPrice(lvl.price)} />
          ))}
        </div>

        {/* Orta: mid fiyat + spread */}
        <div className="flex items-center justify-between border-y border-bn-line px-3 py-1">
          <span className="font-mono text-sm font-semibold text-bn-txt">
            {mid != null ? fmtPrice(symbol, mid) : '—'}
          </span>
          <span className="text-[10px] text-bn-sub">
            Spread {spread != null ? fmtPrice(symbol, spread) : '—'}
            {spreadPct != null ? ` (${spreadPct.toFixed(3)}%)` : ''}
          </span>
        </div>

        <div>
          {bids.map((lvl) => (
            <Row key={`b-${lvl.price}`} lvl={lvl} maxTotal={maxTotal} side="bid" symbol={symbol} onClick={() => fillPrice(lvl.price)} />
          ))}
        </div>
          </div>
        </>
      )}
    </div>
  )
}

interface CumLevel extends DepthLevel {
  total: number
}

/** Seviyeleri grup boyutuna gore birlestirir (Binance hassasiyet secici). */
function groupLevels(levels: DepthLevel[], groupSize: number, isAsk: boolean): DepthLevel[] {
  const map = new Map<number, number>()
  for (const l of levels) {
    const raw = isAsk
      ? Math.ceil(l.price / groupSize) * groupSize
      : Math.floor(l.price / groupSize) * groupSize
    const bucket = Math.round(raw * 1e8) / 1e8
    map.set(bucket, (map.get(bucket) ?? 0) + l.qty)
  }
  const arr = [...map.entries()].map(([price, qty]) => ({ price, qty }))
  arr.sort((a, b) => (isAsk ? a.price - b.price : b.price - a.price))
  return arr
}

function withCumulative(levels: DepthLevel[]): CumLevel[] {
  let running = 0
  return levels.map((l) => {
    running += l.qty
    return { ...l, total: running }
  })
}

function Row({
  lvl,
  maxTotal,
  side,
  symbol,
  onClick,
}: {
  lvl: CumLevel
  maxTotal: number
  side: 'ask' | 'bid'
  symbol: string
  onClick: () => void
}) {
  const pct = (lvl.total / maxTotal) * 100
  return (
    <div
      onClick={onClick}
      className="relative grid cursor-pointer grid-cols-3 px-3 py-[3px] font-mono text-[11px] tabular-nums hover:bg-bn-line/40"
    >
      <div
        className={`absolute inset-y-0 right-0 ${side === 'ask' ? 'bg-bn-down/10' : 'bg-bn-up/10'}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`relative ${side === 'ask' ? 'text-bn-down' : 'text-bn-up'}`}>
        {fmtPrice(symbol, lvl.price)}
      </span>
      <span className="relative text-right text-bn-txt">{fmtQty(symbol, lvl.qty)}</span>
      <span className="relative text-right text-bn-sub">{fmtQty(symbol, lvl.total)}</span>
    </div>
  )
}
