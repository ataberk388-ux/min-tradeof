import { BalancePanel } from '@/components/trade/BalancePanel'
import { BottomTabs } from '@/components/trade/BottomTabs'
import { ChartPanel } from '@/components/trade/ChartPanel'
import { MarketsSidebar } from '@/components/trade/MarketsSidebar'
import { OrderBook } from '@/components/trade/OrderBook'
import { OrderForm } from '@/components/trade/OrderForm'
import { RecentTrades } from '@/components/trade/RecentTrades'
import { SymbolHeader } from '@/components/trade/SymbolHeader'
import { TerminalTopbar } from '@/components/trade/TerminalTopbar'
import { ActiveSymbolProvider } from '@/hooks/useActiveSymbol'
import { useAlarmStream } from '@/hooks/useAlarmStream'
import { useExchangeInfo } from '@/hooks/useExchangeInfo'

/** Binance spot tarzi trading terminali (tam boy order book + trades). */
export function TradingTerminal() {
  // Tetiklenen alarm toast'lari terminalde de aktif kalsin
  useAlarmStream()
  // Sembol ondalik hassasiyetlerini (tickSize/stepSize) bir kez yukle
  useExchangeInfo()

  return (
    <ActiveSymbolProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-bn-bg text-bn-txt">
        <TerminalTopbar />
        <SymbolHeader />

        <div className="flex min-h-0 flex-1">
          {/* Markets */}
          <div className="w-60 shrink-0 border-r border-bn-line">
            <MarketsSidebar />
          </div>

          {/* Order book (tam boy) */}
          <div className="w-64 shrink-0 border-r border-bn-line">
            <OrderBook />
          </div>

          {/* Orta: grafik + alt sekmeler */}
          <div className="flex min-w-0 flex-1 flex-col border-r border-bn-line">
            <div className="min-h-0 flex-1">
              <ChartPanel />
            </div>
            <div className="h-48 shrink-0 border-t border-bn-line">
              <BottomTabs />
            </div>
          </div>

          {/* Sag: emir formu + son islemler + bakiye */}
          <div className="flex w-80 shrink-0 flex-col">
            <div className="min-h-0 flex-1 border-b border-bn-line">
              <OrderForm />
            </div>
            <div className="h-64 shrink-0 border-b border-bn-line">
              <RecentTrades />
            </div>
            <div className="h-40 shrink-0">
              <BalancePanel />
            </div>
          </div>
        </div>
      </div>
    </ActiveSymbolProvider>
  )
}
