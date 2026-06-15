import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CrosshairMode,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts'
import {
  INTERVALS,
  closeWs,
  fetchKlines,
  openKlineStream,
  type Candle,
  type Interval,
} from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { bollinger, ema, sma } from '@/lib/indicators'

interface Indicators {
  ma: boolean
  ema: boolean
  boll: boolean
}

/** TradingView Lightweight Charts ile gercek mum grafigi + indikatorler (Binance verisi). */
export function ChartPanel() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const [interval, setInterval] = useState<Interval>('1m')
  const [debInterval, setDebInterval] = useState<Interval>('1m')
  const [status, setStatus] = useState('Yükleniyor…')
  const [ind, setInd] = useState<Indicators>({ ma: false, ema: false, boll: false })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebInterval(interval), 250)
    return () => clearTimeout(t)
  }, [interval])

  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const maRef = useRef<ISeriesApi<'Line'> | null>(null)
  const emaRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollURef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollMRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollLRef = useRef<ISeriesApi<'Line'> | null>(null)
  const candlesRef = useRef<Candle[]>([])
  const indRef = useRef(ind)
  indRef.current = ind

  // Grafik bir kez kurulur
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#181A20' }, textColor: '#848E9C' },
      grid: { vertLines: { color: '#2B3139' }, horzLines: { color: '#2B3139' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#2B3139', timeVisible: true },
      rightPriceScale: { borderColor: '#2B3139' },
      autoSize: true,
    })
    const series = chart.addCandlestickSeries({
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      priceLineVisible: true,
      lastValueVisible: true,
    })
    const volume = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

    const line = (color: string, width: 1 | 2 = 1) =>
      chart.addLineSeries({ color, lineWidth: width, priceLineVisible: false, lastValueVisible: false, visible: false })

    maRef.current = line('#f6c343')
    emaRef.current = line('#4aa9ff')
    bollURef.current = line('rgba(132,142,156,0.6)')
    bollMRef.current = line('rgba(132,142,156,0.9)')
    bollLRef.current = line('rgba(132,142,156,0.6)')

    chartRef.current = chart
    seriesRef.current = series
    volumeRef.current = volume
    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [])

  // Indikatorleri kapanis fiyatlarindan hesapla ve serilere yaz
  const applyIndicators = () => {
    const candles = candlesRef.current
    if (candles.length === 0) return
    const closes = candles.map((c) => c.close)
    const times = candles.map((c) => c.time as UTCTimestamp)
    const toLine = (vals: (number | null)[]): LineData[] => {
      const arr: LineData[] = []
      for (let i = 0; i < vals.length; i++) {
        const v = vals[i]
        if (v != null) arr.push({ time: times[i], value: v })
      }
      return arr
    }
    maRef.current?.setData(toLine(sma(closes, 7)))
    emaRef.current?.setData(toLine(ema(closes, 25)))
    const b = bollinger(closes, 20, 2)
    bollURef.current?.setData(toLine(b.upper))
    bollMRef.current?.setData(toLine(b.middle))
    bollLRef.current?.setData(toLine(b.lower))
  }

  // Toggle -> seri gorunurlugu
  useEffect(() => {
    maRef.current?.applyOptions({ visible: ind.ma })
    emaRef.current?.applyOptions({ visible: ind.ema })
    bollURef.current?.applyOptions({ visible: ind.boll })
    bollMRef.current?.applyOptions({ visible: ind.boll })
    bollLRef.current?.applyOptions({ visible: ind.boll })
  }, [ind])

  // Sembol/aralik degisince yeniden tohumla + canli akisa baglan
  useEffect(() => {
    let ws: WebSocket | null = null
    let cancelled = false
    let lastInd = 0
    setStatus('Yükleniyor…')

    fetchKlines(symbol, debInterval)
      .then((candles) => {
        if (cancelled || !seriesRef.current) return
        setStatus(`${candles.length} mum · canlı`)
        candlesRef.current = candles
        seriesRef.current.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        )
        volumeRef.current?.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(14,203,129,0.5)' : 'rgba(246,70,93,0.5)',
          })),
        )
        applyIndicators()
        chartRef.current?.timeScale().fitContent()

        ws = openKlineStream(symbol, debInterval, (candle, closed) => {
          if (cancelled) return
          const point: CandlestickData = {
            time: candle.time as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }
          try {
            seriesRef.current?.update(point)
            volumeRef.current?.update({
              time: candle.time as UTCTimestamp,
              value: candle.volume,
              color: candle.close >= candle.open ? 'rgba(14,203,129,0.5)' : 'rgba(246,70,93,0.5)',
            })
            // candlesRef: olusan mumu guncelle
            const arr = candlesRef.current
            const last = arr[arr.length - 1]
            if (last && last.time === candle.time) arr[arr.length - 1] = candle
            else arr.push(candle)
            // Indikatorleri (acikken) kapanista veya en fazla ~2/sn hesapla
            const anyOn = indRef.current.ma || indRef.current.ema || indRef.current.boll
            if (anyOn && (closed || Date.now() - lastInd > 500)) {
              lastInd = Date.now()
              applyIndicators()
            }
          } catch {
            // bayat/sira disi veri: yok say
          }
        })
      })
      .catch((e) => {
        console.error('klines yüklenemedi:', e)
        setStatus(`HATA: ${e?.message ?? 'Binance verisine ulaşılamadı'}`)
      })

    return () => {
      cancelled = true
      if (ws) closeWs(ws)
    }
  }, [symbol, debInterval])

  const toggle = (key: keyof Indicators) => setInd((p) => ({ ...p, [key]: !p[key] }))

  return (
    <div className="flex h-full min-h-0 flex-col bg-bn-panel">
      <div className="flex items-center justify-between border-b border-bn-line px-2 py-1.5">
        <div className="flex items-center gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`rounded px-2 py-1 text-xs font-medium transition ${
                iv === interval ? 'bg-bn-line text-bn-gold' : 'text-bn-sub hover:bg-bn-line/50 hover:text-bn-txt'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <Chip on={ind.ma} onClick={() => toggle('ma')} color="#f6c343">MA</Chip>
          <Chip on={ind.ema} onClick={() => toggle('ema')} color="#4aa9ff">EMA</Chip>
          <Chip on={ind.boll} onClick={() => toggle('boll')} color="#848e9c">BOLL</Chip>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        <span className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-bn-bg/80 px-2 py-0.5 font-mono text-[11px] text-bn-sub">
          {symbol} · {status}
        </span>
      </div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  color,
  children,
}: {
  on: boolean
  onClick: () => void
  color: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 font-medium transition ${
        on ? 'bg-bn-line' : 'text-bn-sub hover:text-bn-txt'
      }`}
      style={on ? { color } : undefined}
    >
      {children}
    </button>
  )
}
