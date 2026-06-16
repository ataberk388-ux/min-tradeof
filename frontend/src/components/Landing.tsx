import type { ReactNode } from 'react'
import { Activity, Bell, CandlestickChart, LineChart, Wallet } from 'lucide-react'

const BARS = [38, 62, 48, 80, 56, 72, 44, 90, 60, 76, 50, 84, 46, 68, 58, 78]

/** Login oncesi tanitim sayfasi (Binance esinli). onStart -> giris/kayit ekrani. */
export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-bn-bg text-bn-txt">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bn-gold">
            <Bell className="h-5 w-5 text-bn-bg" />
          </div>
          <span className="text-lg font-bold">Crypto Alarm</span>
        </div>
        <button
          onClick={onStart}
          className="rounded-md bg-bn-gold px-4 py-2 text-sm font-semibold text-bn-bg transition hover:opacity-90"
        >
          Giriş yap
        </button>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-block rounded-full border border-bn-line bg-bn-panel px-3 py-1 text-xs text-bn-sub">
            Gerçek Binance verisi · Risksiz
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
            Kripto spot trading'i{' '}
            <span className="text-bn-gold">risksiz</span> öğren.
          </h1>
          <p className="mt-4 max-w-md text-bn-sub">
            Gerçek Binance fiyat akışıyla paper trading. Sanal bakiye, canlı grafikler,
            indikatörler ve fiyat alarmları — tek kuruş risk olmadan.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={onStart}
              className="rounded-md bg-bn-gold px-5 py-2.5 font-semibold text-bn-bg transition hover:opacity-90"
            >
              Demo'yu dene
            </button>
            <button
              onClick={onStart}
              className="rounded-md border border-bn-line px-5 py-2.5 font-semibold text-bn-txt transition hover:bg-bn-panel"
            >
              Giriş yap
            </button>
          </div>
        </div>

        {/* Gorsel: canli his veren mum cubuklari */}
        <div className="relative hidden h-72 items-end justify-center gap-2 overflow-hidden rounded-xl border border-bn-line bg-bn-panel p-6 lg:flex">
          {BARS.map((h, i) => (
            <div
              key={i}
              className="auth-bar w-3"
              style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </section>

      {/* Ozellikler */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Activity className="h-5 w-5 text-bn-gold" />} title="Gerçek piyasa verisi">
            Binance WebSocket/REST: canlı grafik, order book, son işlemler, yüzlerce market.
          </Feature>
          <Feature icon={<Wallet className="h-5 w-5 text-bn-gold" />} title="Paper trading">
            Sanal USDT bakiyesi, piyasa/limit emir, pozisyonlar ve canlı PNL.
          </Feature>
          <Feature icon={<Bell className="h-5 w-5 text-bn-gold" />} title="Fiyat alarm motoru">
            Thread-safe, yüksek-throughput eşleştirme; tetiklenince anında bildirim.
          </Feature>
          <Feature icon={<LineChart className="h-5 w-5 text-bn-gold" />} title="TradingView grafik">
            Mum/çizgi/alan, MA · EMA · Bollinger · RSI · MACD, derinlik grafiği.
          </Feature>
        </div>
      </section>

      <footer className="border-t border-bn-line py-6 text-center text-xs text-bn-sub">
        <CandlestickChart className="mx-auto mb-1 h-4 w-4" />
        Eğitim/demo amaçlı · gerçek para yoktur
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-bn-line bg-bn-panel p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-bn-gold/15">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-bn-sub">{children}</p>
    </div>
  )
}
