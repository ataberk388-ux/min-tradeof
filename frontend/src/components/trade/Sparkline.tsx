import { useQuery } from '@tanstack/react-query'
import { fetchKlines } from '@/lib/binance'

/**
 * Satir basina mini fiyat grafigi (son ~6 saat, 15dk mumlar). Sembol basina bir kez
 * cekilir (5 dk cache) — REST agirligi dusuk oldugu icin liste icin guvenli.
 */
export function Sparkline({ symbol, up }: { symbol: string; up: boolean }) {
  const { data } = useQuery({
    queryKey: ['sparkline', symbol],
    queryFn: () => fetchKlines(symbol, '15m', 24),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const w = 44
  const h = 18
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} />

  const closes = data.map((c) => c.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1
  const points = closes
    .map((c, i) => `${(i / (closes.length - 1)) * w},${h - ((c - min) / range) * h}`)
    .join(' ')

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={up ? '#0ECB81' : '#F6465D'}
        strokeWidth={1}
      />
    </svg>
  )
}
