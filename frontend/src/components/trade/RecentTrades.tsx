import { useEffect, useState } from 'react'
import { closeWs, fetchTrades, openTradeStream, type Trade } from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { fmtPrice, fmtQty } from '@/lib/symbolFormat'

const MAX = 40

export function RecentTrades() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    let ws: WebSocket | null = null
    let cancelled = false
    let buffer: Trade[] = [] // yogun akista gelen islemleri biriktir
    let raf = 0
    setTrades([])

    const flush = () => {
      raf = 0
      if (buffer.length === 0) return
      const batch = buffer
      buffer = []
      // En yeni once: bu turda gelenleri (tersten) onceki listenin basina ekle
      setTrades((prev) => [...batch.reverse(), ...prev].slice(0, MAX))
    }

    fetchTrades(symbol, MAX)
      .then((seed) => {
        if (cancelled) return
        setTrades([...seed].reverse()) // en yeni once
        // BTC gibi coinlerde saniyede yuzlerce islem gelir -> her birinde render YERINE
        // rAF ile ~60fps'de tek seferde gruplu render (lag'i bitirir)
        ws = openTradeStream(symbol, (t) => {
          if (cancelled) return
          buffer.push(t)
          if (!raf) raf = requestAnimationFrame(flush)
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      if (ws) closeWs(ws)
    }
  }, [symbol])

  return (
    <div className="flex h-full flex-col bg-bn-panel">
      <div className="border-b border-bn-line px-3 py-1.5 text-xs font-medium text-bn-txt">
        Son İşlemler
      </div>
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] uppercase tracking-wide text-bn-sub">
        <span>Fiyat</span>
        <span className="text-right">Miktar</span>
        <span className="text-right">Zaman</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {trades.map((t, i) => {
          const sell = t.isBuyerMaker
          return (
            <div
              key={`${t.id}-${i}`}
              className="grid grid-cols-3 px-3 py-[3px] font-mono text-[11px] tabular-nums"
            >
              <span className={sell ? 'text-bn-down' : 'text-bn-up'}>{fmtPrice(symbol, t.price)}</span>
              <span className="text-right text-bn-txt">{fmtQty(symbol, t.qty)}</span>
              <span className="text-right text-bn-sub">{timeOf(t.time)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function timeOf(ms: number): string {
  return new Date(ms).toLocaleTimeString('tr-TR', { hour12: false })
}
