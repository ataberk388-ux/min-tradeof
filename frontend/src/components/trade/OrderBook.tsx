import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import {
  closeWs,
  openDepthStream,
  openTradeStream,
  type DepthLevel,
  type DepthSnapshot,
} from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useOrderTicket } from '@/hooks/useOrderTicket'
import { usePaperOrders } from '@/hooks/usePaper'
import { formatNum } from '@/lib/format'
import { fmtPrice, fmtQty, priceDecimals } from '@/lib/symbolFormat'
import { DepthChart } from '@/components/trade/DepthChart'

const ROWS = 12

/** Seviyeyi grup boyutuna gore bucket'lar (asks yukari, bids asagi yuvarlar). */
function bucketPrice(price: number, groupSize: number, isAsk: boolean): number {
  const raw = isAsk
    ? Math.ceil(price / groupSize) * groupSize
    : Math.floor(price / groupSize) * groupSize
  return Math.round(raw * 1e8) / 1e8
}

/** Hover tooltip icin: bir seviyeye kadar birikimli ortalama/miktar/maliyet. */
interface HoverTip {
  x: number
  y: number
  avg: number
  sum: number
  cost: number
}

export function OrderBook() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const { fillPrice } = useOrderTicket()
  const { data: paperOrders } = usePaperOrders()
  const [depth, setDepth] = useState<DepthSnapshot>({ bids: [], asks: [] })

  const asset = symbol.replace(/USDT$/, '')

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

  // Canli son islem fiyati (orta cizgi) + yon/flash
  const [last, setLast] = useState<number | null>(null)
  const [lastDir, setLastDir] = useState<'' | 'up' | 'down'>('')
  const [lastFlash, setLastFlash] = useState('')
  const prevLast = useRef<number | null>(null)
  useEffect(() => {
    setLast(null)
    setLastDir('')
    prevLast.current = null
    const ws = openTradeStream(symbol, (t) => {
      setLast(t.price)
      if (prevLast.current != null && t.price !== prevLast.current) {
        const dir = t.price > prevLast.current ? 'up' : 'down'
        setLastDir(dir)
        setLastFlash(dir === 'up' ? 'flash-up' : 'flash-down')
        setTimeout(() => setLastFlash(''), 400)
      }
      prevLast.current = t.price
    })
    return () => closeWs(ws)
  }, [symbol])

  // Gruplama secenekleri: tickSize, x10, x100, x1000 (Binance hassasiyet secici)
  const baseTick = Math.pow(10, -priceDecimals(symbol, depth.asks[0]?.price))
  const groupOptions = useMemo(
    () => [baseTick, baseTick * 10, baseTick * 100, baseTick * 1000],
    [baseTick],
  )
  const [group, setGroup] = useState<number | null>(null)
  const groupSize = group ?? baseTick
  const [view, setView] = useState<'book' | 'depth'>('book')
  const [mode, setMode] = useState<'all' | 'bids' | 'asks'>('all')
  const rowCount = mode === 'all' ? ROWS : ROWS * 2

  // Kendi acik limit emirlerin (bu sembol) — defterde isaretlemek icin bucket->qty haritasi
  const openLimits = useMemo(
    () =>
      (paperOrders ?? []).filter(
        (o) => o.status === 'OPEN' && o.type === 'LIMIT' && o.symbol === symbol && o.price != null,
      ),
    [paperOrders, symbol],
  )
  const myAsks = useMemo(() => {
    const m = new Map<number, number>()
    for (const o of openLimits)
      if (o.side === 'SELL') {
        const b = bucketPrice(o.price!, groupSize, true)
        m.set(b, (m.get(b) ?? 0) + o.qty)
      }
    return m
  }, [openLimits, groupSize])
  const myBids = useMemo(() => {
    const m = new Map<number, number>()
    for (const o of openLimits)
      if (o.side === 'BUY') {
        const b = bucketPrice(o.price!, groupSize, false)
        m.set(b, (m.get(b) ?? 0) + o.qty)
      }
    return m
  }, [openLimits, groupSize])

  const asks = useMemo(
    () =>
      withCumulative(groupLevels(depth.asks, groupSize, true).slice(0, rowCount)).map((l) => ({
        ...l,
        mine: myAsks.get(l.price),
      })),
    [depth.asks, groupSize, rowCount, myAsks],
  )
  const bids = useMemo(
    () =>
      withCumulative(groupLevels(depth.bids, groupSize, false).slice(0, rowCount)).map((l) => ({
        ...l,
        mine: myBids.get(l.price),
      })),
    [depth.bids, groupSize, rowCount, myBids],
  )
  const maxTotal = Math.max(asks.at(-1)?.total ?? 0, bids.at(-1)?.total ?? 0, 1)

  const bestAsk = depth.asks[0]?.price
  const bestBid = depth.bids[0]?.price
  const mid = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null
  const spreadPct = spread && mid ? (spread / mid) * 100 : null

  // Alis/satis baskisi (tum gorunur derinligin hacim orani)
  const totalBidVol = useMemo(() => depth.bids.reduce((s, l) => s + l.qty, 0), [depth.bids])
  const totalAskVol = useMemo(() => depth.asks.reduce((s, l) => s + l.qty, 0), [depth.asks])
  const bidPct = totalBidVol + totalAskVol > 0 ? (totalBidVol / (totalBidVol + totalAskVol)) * 100 : 50

  // Hover tooltip (cursor takipli)
  const [tip, setTip] = useState<HoverTip | null>(null)
  const onHover = (e: React.MouseEvent, lvl: CumLevel) =>
    setTip({ x: e.clientX, y: e.clientY, avg: lvl.cost / lvl.total, sum: lvl.total, cost: lvl.cost })

  const headPrice = last ?? mid

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
          {/* Alis/Satis baskisi */}
          <div className="px-3 pt-1.5">
            <div className="mb-1 flex justify-between text-[10px] font-medium">
              <span className="text-bn-up">Alış {bidPct.toFixed(0)}%</span>
              <span className="text-bn-down">{(100 - bidPct).toFixed(0)}% Satış</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-bn-down/30">
              <div className="bg-bn-up" style={{ width: `${bidPct}%` }} />
            </div>
          </div>

          {/* Gorunum modu */}
          <div className="flex gap-1 px-3 py-1.5 text-[10px]">
            <ModeBtn active={mode === 'all'} onClick={() => setMode('all')}>Hepsi</ModeBtn>
            <ModeBtn active={mode === 'bids'} onClick={() => setMode('bids')}>Alış</ModeBtn>
            <ModeBtn active={mode === 'asks'} onClick={() => setMode('asks')}>Satış</ModeBtn>
          </div>

          <div className="grid grid-cols-3 px-3 py-1 text-[10px] uppercase tracking-wide text-bn-sub">
            <span>Fiyat</span>
            <span className="text-right">Miktar ({asset})</span>
            <span className="text-right">Toplam ({asset})</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto" onMouseLeave={() => setTip(null)}>
            {mode !== 'bids' && (
              <div className="flex flex-col-reverse">
                {asks.map((lvl) => (
                  <Row key={`a-${lvl.price}`} lvl={lvl} maxTotal={maxTotal} side="ask" symbol={symbol} onClick={() => fillPrice(lvl.price)} onHover={onHover} />
                ))}
              </div>
            )}

            {/* Canli son fiyat + spread */}
            <div className="flex items-center justify-between border-y border-bn-line px-3 py-1.5">
              <span className={`flex items-center gap-1 rounded px-1 font-mono text-base font-semibold tabular-nums ${lastFlash} ${lastDir === 'up' ? 'text-bn-up' : lastDir === 'down' ? 'text-bn-down' : 'text-bn-txt'}`}>
                {headPrice != null ? fmtPrice(symbol, headPrice) : '—'}
                {lastDir === 'up' ? <ArrowUp className="h-3.5 w-3.5" /> : lastDir === 'down' ? <ArrowDown className="h-3.5 w-3.5" /> : null}
              </span>
              <span className="text-right text-[10px] text-bn-sub">
                <span className="block">Son fiyat</span>
                <span className="block">
                  Spread {spread != null ? fmtPrice(symbol, spread) : '—'}
                  {spreadPct != null ? ` (${spreadPct.toFixed(3)}%)` : ''}
                </span>
              </span>
            </div>

            {mode !== 'asks' && (
              <div>
                {bids.map((lvl) => (
                  <Row key={`b-${lvl.price}`} lvl={lvl} maxTotal={maxTotal} side="bid" symbol={symbol} onClick={() => fillPrice(lvl.price)} onHover={onHover} />
                ))}
              </div>
            )}
          </div>

          {/* Gorunur toplam hacim */}
          <div className="flex justify-between border-t border-bn-line px-3 py-1 text-[10px] text-bn-sub">
            <span>Σ Alış: <span className="font-mono text-bn-up">{fmtQty(symbol, totalBidVol)}</span></span>
            <span>Σ Satış: <span className="font-mono text-bn-down">{fmtQty(symbol, totalAskVol)}</span></span>
          </div>
        </>
      )}

      {/* Hover tooltip */}
      {tip && view === 'book' && (
        <div
          className="pointer-events-none fixed z-50 rounded border border-bn-line bg-bn-panel2 px-2 py-1.5 text-[10px] shadow-lg"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          <Line label="Ort. fiyat" value={fmtPrice(symbol, tip.avg)} />
          <Line label={`Σ Miktar (${asset})`} value={fmtQty(symbol, tip.sum)} />
          <Line label="Σ Toplam (USDT)" value={formatNum(tip.cost, 2)} />
        </div>
      )}
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-bn-sub">{label}</span>
      <span className="font-mono text-bn-txt">{value}</span>
    </div>
  )
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-0.5 transition ${
        active ? 'bg-bn-line text-bn-txt' : 'text-bn-sub hover:text-bn-txt'
      }`}
    >
      {children}
    </button>
  )
}

interface CumLevel extends DepthLevel {
  total: number
  cost: number
  mine?: number
}

/** Seviyeleri grup boyutuna gore birlestirir (Binance hassasiyet secici). */
function groupLevels(levels: DepthLevel[], groupSize: number, isAsk: boolean): DepthLevel[] {
  const map = new Map<number, number>()
  for (const l of levels) {
    const bucket = bucketPrice(l.price, groupSize, isAsk)
    map.set(bucket, (map.get(bucket) ?? 0) + l.qty)
  }
  const arr = [...map.entries()].map(([price, qty]) => ({ price, qty }))
  arr.sort((a, b) => (isAsk ? a.price - b.price : b.price - a.price))
  return arr
}

function withCumulative(levels: DepthLevel[]): CumLevel[] {
  let running = 0
  let cost = 0
  return levels.map((l) => {
    running += l.qty
    cost += l.price * l.qty
    return { ...l, total: running, cost }
  })
}

function Row({
  lvl,
  maxTotal,
  side,
  symbol,
  onClick,
  onHover,
}: {
  lvl: CumLevel
  maxTotal: number
  side: 'ask' | 'bid'
  symbol: string
  onClick: () => void
  onHover: (e: React.MouseEvent, lvl: CumLevel) => void
}) {
  const pct = (lvl.total / maxTotal) * 100

  // Miktar belirgin degisince satir flash (Web Animations API — temiz yeniden tetikleme)
  const rowRef = useRef<HTMLDivElement>(null)
  const prevQty = useRef(lvl.qty)
  useEffect(() => {
    const prev = prevQty.current
    if (prev !== lvl.qty) {
      const delta = prev > 0 ? Math.abs(lvl.qty - prev) / prev : 1
      if (delta > 0.02) {
        const up = lvl.qty > prev
        rowRef.current?.animate(
          [
            { backgroundColor: up ? 'rgba(14,203,129,0.22)' : 'rgba(246,70,93,0.22)' },
            { backgroundColor: 'transparent' },
          ],
          { duration: 400, easing: 'ease-out' },
        )
      }
      prevQty.current = lvl.qty
    }
  }, [lvl.qty])

  return (
    <div
      ref={rowRef}
      onClick={onClick}
      onMouseEnter={(e) => onHover(e, lvl)}
      onMouseMove={(e) => onHover(e, lvl)}
      className="relative grid cursor-pointer grid-cols-3 px-3 py-[3px] font-mono text-[11px] tabular-nums hover:bg-bn-line/40"
    >
      {/* Birikimli derinlik bar'i (Binance) — saga dogru kumulatif hacim orani */}
      <div
        className={`absolute inset-y-0 right-0 ${side === 'ask' ? 'bg-bn-down/20' : 'bg-bn-up/20'}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`relative flex items-center gap-1 ${side === 'ask' ? 'text-bn-down' : 'text-bn-up'}`}>
        {lvl.mine != null && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-bn-gold"
            title={`Senin emrin: ${fmtQty(symbol, lvl.mine)}`}
          />
        )}
        {fmtPrice(symbol, lvl.price)}
      </span>
      <span className="relative text-right text-bn-txt">{fmtQty(symbol, lvl.qty)}</span>
      <span className="relative text-right text-bn-sub">{fmtQty(symbol, lvl.total)}</span>
    </div>
  )
}
