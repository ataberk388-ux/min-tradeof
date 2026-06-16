import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Maximize2, Minimize2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  CrosshairMode,
  LineStyle,
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
import { toast } from 'sonner'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { useCreateAlarm } from '@/hooks/useAlarms'
import { useTheme } from '@/hooks/useTheme'
import { bollinger, ema, macd, rsi, sma } from '@/lib/indicators'
import { fmtPrice, priceDecimals } from '@/lib/symbolFormat'
import { formatCompact } from '@/lib/format'
import type { ApiError } from '@/lib/api'

function chartColors(theme: 'dark' | 'light') {
  return theme === 'dark'
    ? { bg: '#181A20', text: '#848E9C', grid: '#2B3139' }
    : { bg: '#FFFFFF', text: '#707A8A', grid: '#EAECEF' }
}

interface Ohlc {
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface Indicators {
  ma: boolean
  ema: boolean
  boll: boolean
  rsi: boolean
  macd: boolean
}

/** TradingView Lightweight Charts ile gercek mum grafigi + indikatorler (Binance verisi). */
export function ChartPanel() {
  const { debouncedSymbol: symbol } = useActiveSymbol()
  const [interval, setInterval] = useState<Interval>('1m')
  const [debInterval, setDebInterval] = useState<Interval>('1m')
  const [status, setStatus] = useState('Yükleniyor…')
  const [ind, setInd] = useState<Indicators>({
    ma: false,
    ema: false,
    boll: false,
    rsi: false,
    macd: false,
  })
  const [ohlc, setOhlc] = useState<Ohlc | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>('candle')
  const isMobile = useIsMobile()
  const { theme } = useTheme()
  const themeRef = useRef(theme)
  themeRef.current = theme
  const hoveringRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rsiContainerRef = useRef<HTMLDivElement>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdContainerRef = useRef<HTMLDivElement>(null)
  const macdChartRef = useRef<IChartApi | null>(null)
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebInterval(interval), 250)
    return () => clearTimeout(t)
  }, [interval])

  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const areaRef = useRef<ISeriesApi<'Area'> | null>(null)
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
    // Cizgi + alan serileri (gizli; grafik tipi degisince gorunur olur)
    const lineSeries = chart.addLineSeries({ color: '#FCD535', lineWidth: 2, visible: false })
    const areaSeries = chart.addAreaSeries({
      lineColor: '#FCD535',
      topColor: 'rgba(252,213,53,0.2)',
      bottomColor: 'rgba(252,213,53,0)',
      lineWidth: 2,
      visible: false,
    })
    lineRef.current = lineSeries
    areaRef.current = areaSeries

    const volume = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

    const line = (color: string, width: 1 | 2 = 1) =>
      chart.addLineSeries({ color, lineWidth: width, priceLineVisible: false, lastValueVisible: false, visible: false })

    maRef.current = line('#f6c343')
    emaRef.current = line('#4aa9ff')
    bollURef.current = line('rgba(132,142,156,0.6)')
    bollMRef.current = line('rgba(132,142,156,0.9)')
    bollLRef.current = line('rgba(132,142,156,0.6)')

    // OHLC legend: imlec gezince o mumun degerleri, gezmiyorken son mum
    chart.subscribeCrosshairMove((param) => {
      const cd = param.seriesData.get(series) as
        | { open: number; high: number; low: number; close: number }
        | undefined
      const vd = param.seriesData.get(volume) as { value?: number } | undefined
      if (cd && cd.open != null) {
        hoveringRef.current = true
        setOhlc({ o: cd.open, h: cd.high, l: cd.low, c: cd.close, v: vd?.value ?? 0 })
      } else {
        hoveringRef.current = false
        const arr = candlesRef.current
        const last = arr[arr.length - 1]
        if (last) setOhlc({ o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume })
      }
    })

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
    if (rsiSeriesRef.current) rsiSeriesRef.current.setData(toLine(rsi(closes, 14)))
    if (macdLineRef.current) {
      const m = macd(closes)
      macdLineRef.current.setData(toLine(m.macd))
      macdSignalRef.current?.setData(toLine(m.signal))
      macdHistRef.current?.setData(
        m.hist.map((v, i) =>
          v == null
            ? null
            : { time: times[i], value: v, color: v >= 0 ? 'rgba(14,203,129,0.5)' : 'rgba(246,70,93,0.5)' },
        ).filter((x): x is { time: UTCTimestamp; value: number; color: string } => x != null),
      )
    }
  }

  // RSI alt-pane: acikken ayri kucuk grafik olusturulur, kapaninca yok edilir
  useEffect(() => {
    if (!ind.rsi || !rsiContainerRef.current) return
    const tc = chartColors(themeRef.current)
    const chart = createChart(rsiContainerRef.current, {
      layout: { background: { color: tc.bg }, textColor: tc.text },
      grid: { vertLines: { visible: false }, horzLines: { color: tc.grid } },
      timeScale: { borderColor: tc.grid, visible: false },
      rightPriceScale: { borderColor: tc.grid },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    })
    const series = chart.addLineSeries({
      color: '#9b87f5',
      lineWidth: 1,
      priceLineVisible: false,
    })
    series.createPriceLine({ price: 70, color: 'rgba(246,70,93,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' })
    series.createPriceLine({ price: 30, color: 'rgba(14,203,129,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' })
    rsiChartRef.current = chart
    rsiSeriesRef.current = series
    applyIndicators()

    const main = chartRef.current
    const sync = (range: unknown) => {
      if (range) {
        try {
          chart.timeScale().setVisibleLogicalRange(range as never)
        } catch {
          /* yok say */
        }
      }
    }
    const r = main?.timeScale().getVisibleLogicalRange()
    if (r) sync(r)
    main?.timeScale().subscribeVisibleLogicalRangeChange(sync)

    return () => {
      main?.timeScale().unsubscribeVisibleLogicalRangeChange(sync)
      chart.remove()
      rsiChartRef.current = null
      rsiSeriesRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ind.rsi])

  // MACD alt-pane
  useEffect(() => {
    if (!ind.macd || !macdContainerRef.current) return
    const tc = chartColors(themeRef.current)
    const chart = createChart(macdContainerRef.current, {
      layout: { background: { color: tc.bg }, textColor: tc.text },
      grid: { vertLines: { visible: false }, horzLines: { color: tc.grid } },
      timeScale: { borderColor: tc.grid, visible: false },
      rightPriceScale: { borderColor: tc.grid },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    })
    macdHistRef.current = chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false })
    macdLineRef.current = chart.addLineSeries({ color: '#4aa9ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    macdSignalRef.current = chart.addLineSeries({ color: '#f6c343', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    macdChartRef.current = chart
    applyIndicators()

    const main = chartRef.current
    const sync = (range: unknown) => {
      if (range) {
        try {
          chart.timeScale().setVisibleLogicalRange(range as never)
        } catch {
          /* yok say */
        }
      }
    }
    const r = main?.timeScale().getVisibleLogicalRange()
    if (r) sync(r)
    main?.timeScale().subscribeVisibleLogicalRangeChange(sync)

    return () => {
      main?.timeScale().unsubscribeVisibleLogicalRangeChange(sync)
      chart.remove()
      macdChartRef.current = null
      macdLineRef.current = null
      macdSignalRef.current = null
      macdHistRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ind.macd])

  // Toggle -> seri gorunurlugu
  useEffect(() => {
    maRef.current?.applyOptions({ visible: ind.ma })
    emaRef.current?.applyOptions({ visible: ind.ema })
    bollURef.current?.applyOptions({ visible: ind.boll })
    bollMRef.current?.applyOptions({ visible: ind.boll })
    bollLRef.current?.applyOptions({ visible: ind.boll })
  }, [ind])

  // Tema -> grafik arkaplan/grid/yazi renkleri
  useEffect(() => {
    const c = chartColors(theme)
    const base = {
      layout: { background: { color: c.bg }, textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      timeScale: { borderColor: c.grid },
      rightPriceScale: { borderColor: c.grid },
    }
    chartRef.current?.applyOptions(base)
    rsiChartRef.current?.applyOptions(base)
    macdChartRef.current?.applyOptions(base)
  }, [theme])

  // Grafik tipi -> seri gorunurlugu (mum/cizgi/alan)
  useEffect(() => {
    seriesRef.current?.applyOptions({ visible: chartType === 'candle' })
    lineRef.current?.applyOptions({ visible: chartType === 'line' })
    areaRef.current?.applyOptions({ visible: chartType === 'area' })
  }, [chartType])

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
        const closeLine = candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
        lineRef.current?.setData(closeLine)
        areaRef.current?.setData(closeLine)
        applyIndicators()
        const lastCandle = candles[candles.length - 1]
        if (lastCandle && !hoveringRef.current) {
          setOhlc({
            o: lastCandle.open,
            h: lastCandle.high,
            l: lastCandle.low,
            c: lastCandle.close,
            v: lastCandle.volume,
          })
        }
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
            lineRef.current?.update({ time: candle.time as UTCTimestamp, value: candle.close })
            areaRef.current?.update({ time: candle.time as UTCTimestamp, value: candle.close })
            // candlesRef: olusan mumu guncelle
            const arr = candlesRef.current
            const last = arr[arr.length - 1]
            if (last && last.time === candle.time) arr[arr.length - 1] = candle
            else arr.push(candle)
            if (!hoveringRef.current) {
              setOhlc({
                o: candle.open,
                h: candle.high,
                l: candle.low,
                c: candle.close,
                v: candle.volume,
              })
            }
            // Indikatorleri (acikken) kapanista veya en fazla ~2/sn hesapla
            const anyOn =
              indRef.current.ma ||
              indRef.current.ema ||
              indRef.current.boll ||
              indRef.current.rsi ||
              indRef.current.macd
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

  const createAlarm = useCreateAlarm()

  // Grafige sag tik -> o fiyata alarm kur (yon: mevcut fiyata gore otomatik)
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const series = seriesRef.current
    if (!series) return
    const rect = e.currentTarget.getBoundingClientRect()
    const price = series.coordinateToPrice(e.clientY - rect.top)
    if (price == null) return
    const last = candlesRef.current.at(-1)?.close ?? price
    const direction = price >= last ? 'ABOVE' : 'BELOW'
    const target = price.toFixed(priceDecimals(symbol, price))
    createAlarm.mutate(
      { symbol, targetPrice: target, direction, type: 'PRICE' },
      {
        onSuccess: () =>
          toast.success(`Alarm kuruldu: ${symbol} ${direction === 'ABOVE' ? '≥' : '≤'} ${target}`),
        onError: (err) => toast.error((err as unknown as ApiError).message ?? 'Alarm kurulamadı'),
      },
    )
  }

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-bn-panel'
          : 'flex h-full min-h-0 flex-col bg-bn-panel'
      }
    >
      <div className="flex items-center justify-between gap-1 border-b border-bn-line px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
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
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'candle' | 'line' | 'area')}
            className="ml-1 rounded border border-bn-line bg-bn-panel2 px-1 py-1 text-[11px] text-bn-sub outline-none"
            title="Grafik tipi"
          >
            <option value="candle">Mum</option>
            <option value="line">Çizgi</option>
            <option value="area">Alan</option>
          </select>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px]">
          {isMobile ? (
            <IndicatorMenu ind={ind} toggle={toggle} />
          ) : (
            <>
              <Chip on={ind.ma} onClick={() => toggle('ma')} color="#f6c343">MA</Chip>
              <Chip on={ind.ema} onClick={() => toggle('ema')} color="#4aa9ff">EMA</Chip>
              <Chip on={ind.boll} onClick={() => toggle('boll')} color="#848e9c">BOLL</Chip>
              <Chip on={ind.rsi} onClick={() => toggle('rsi')} color="#9b87f5">RSI</Chip>
              <Chip on={ind.macd} onClick={() => toggle('macd')} color="#4aa9ff">MACD</Chip>
            </>
          )}
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="ml-1 rounded p-1 text-bn-sub transition hover:bg-bn-line hover:text-bn-txt"
            title={fullscreen ? 'Küçült' : 'Tam ekran'}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="absolute inset-0" onContextMenu={onContextMenu} />
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded bg-bn-bg/80 px-2 py-0.5 font-mono text-[11px]">
          <span className="font-semibold text-bn-txt">{symbol.replace(/USDT$/, '')}/USDT</span>
          {ohlc ? (
            <>
              {(['o', 'h', 'l', 'c'] as const).map((k) => (
                <span key={k} className="text-bn-sub">
                  {k.toUpperCase()}{' '}
                  <span className={ohlc.c >= ohlc.o ? 'text-bn-up' : 'text-bn-down'}>
                    {fmtPrice(symbol, ohlc[k])}
                  </span>
                </span>
              ))}
              <span className="text-bn-sub">Vol {formatCompact(ohlc.v)}</span>
            </>
          ) : (
            <span className="text-bn-sub">{status}</span>
          )}
        </div>
      </div>
      {ind.rsi && (
        <div className="relative h-20 shrink-0 border-t border-bn-line">
          <div ref={rsiContainerRef} className="absolute inset-0" />
          <span className="pointer-events-none absolute left-2 top-1 z-10 text-[10px] text-bn-sub">
            RSI 14
          </span>
        </div>
      )}
      {ind.macd && (
        <div className="relative h-20 shrink-0 border-t border-bn-line">
          <div ref={macdContainerRef} className="absolute inset-0" />
          <span className="pointer-events-none absolute left-2 top-1 z-10 text-[10px] text-bn-sub">
            MACD 12 26 9
          </span>
        </div>
      )}
    </div>
  )
}

/** Mobilde indikatorleri tek menude toplar (ust bar kalabaligini onler). */
function IndicatorMenu({
  ind,
  toggle,
}: {
  ind: Indicators
  toggle: (k: keyof Indicators) => void
}) {
  const items: [keyof Indicators, string][] = [
    ['ma', 'MA'],
    ['ema', 'EMA'],
    ['boll', 'BOLL'],
    ['rsi', 'RSI'],
    ['macd', 'MACD'],
  ]
  const activeCount = items.filter(([k]) => ind[k]).length
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1 rounded px-2 py-1 text-bn-sub transition hover:bg-bn-line hover:text-bn-txt">
          İndikatör{activeCount > 0 ? ` (${activeCount})` : ''}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 rounded-md border border-bn-line bg-bn-panel p-1 text-bn-txt shadow-xl"
        >
          {items.map(([k, label]) => (
            <DropdownMenu.Item
              key={k}
              onSelect={(e) => {
                e.preventDefault()
                toggle(k)
              }}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition focus:bg-bn-line"
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                  ind[k] ? 'border-bn-gold bg-bn-gold text-bn-bg' : 'border-bn-line'
                }`}
              >
                {ind[k] ? '✓' : ''}
              </span>
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
