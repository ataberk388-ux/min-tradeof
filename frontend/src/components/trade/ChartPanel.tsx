import { useEffect, useRef, useState } from 'react'
import {
  CrosshairMode,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import {
  INTERVALS,
  closeWs,
  fetchKlines,
  openKlineStream,
  type Interval,
} from '@/lib/binance'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'

/** TradingView Lightweight Charts ile gercek mum grafigi (Binance verisi). */
export function ChartPanel() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const [interval, setInterval] = useState<Interval>('1m')
  const [debInterval, setDebInterval] = useState<Interval>('1m')
  const [status, setStatus] = useState('Yükleniyor…')
  const containerRef = useRef<HTMLDivElement>(null)

  // Aralik degisiminde de Binance'i bogmamak icin debounce
  useEffect(() => {
    const t = setTimeout(() => setDebInterval(interval), 250)
    return () => clearTimeout(t)
  }, [interval])
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  // Grafik bir kez kurulur; konteyner boyutuna gore responsive
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#181A20' }, textColor: '#848E9C' },
      grid: {
        vertLines: { color: '#2B3139' },
        horzLines: { color: '#2B3139' },
      },
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
      priceLineVisible: true, // son fiyat cizgisi
      lastValueVisible: true,
    })
    // Hacim histogrami: alt %20'lik bantta, ayri (gorunmez) fiyat olcegi
    const volume = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

    chartRef.current = chart
    seriesRef.current = series
    volumeRef.current = volume
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      volumeRef.current = null
    }
  }, [])

  // Sembol/aralik degisince yeniden tohumla + canli akisa baglan
  useEffect(() => {
    let ws: WebSocket | null = null
    let cancelled = false
    setStatus('Yükleniyor…')

    fetchKlines(symbol, debInterval)
      .then((candles) => {
        if (cancelled || !seriesRef.current) return
        setStatus(`${candles.length} mum · canlı`)
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
        chartRef.current?.timeScale().fitContent()

        ws = openKlineStream(symbol, debInterval, (candle) => {
          // Bu efekt iptal olduysa (sembol/aralik degisti) bayat mumu yeni grafige YAZMA
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
          } catch {
            // Sira disi/bayat veri: grafik durumunu bozmamak icin sessizce yok say
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-bn-panel">
      <div className="flex items-center gap-1 border-b border-bn-line px-2 py-1.5">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              iv === interval
                ? 'bg-bn-line text-bn-gold'
                : 'text-bn-sub hover:bg-bn-line/50 hover:text-bn-txt'
            }`}
          >
            {iv}
          </button>
        ))}
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
