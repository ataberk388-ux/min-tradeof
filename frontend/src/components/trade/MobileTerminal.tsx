import { useEffect, useState } from 'react'
import { useOrderTicket } from '@/hooks/useOrderTicket'
import { BalancePanel } from '@/components/trade/BalancePanel'
import { BottomTabs } from '@/components/trade/BottomTabs'
import { ChartPanel } from '@/components/trade/ChartPanel'
import { MarketsSidebar } from '@/components/trade/MarketsSidebar'
import { MobileTabBar, type MobileTab } from '@/components/trade/MobileTabBar'
import { MobileTopbar } from '@/components/trade/MobileTopbar'
import { OrderBook } from '@/components/trade/OrderBook'
import { OrderForm } from '@/components/trade/OrderForm'
import { RecentTrades } from '@/components/trade/RecentTrades'

/** Telefon duzeni: alttan sekmeli, tek ekran (Binance mobil app gibi). Masaustu bilesenlerini yeniden kullanir. */
export function MobileTerminal() {
  const [tab, setTab] = useState<MobileTab>('chart')
  const { ticket } = useOrderTicket()

  // Order book'tan fiyata dokununca otomatik Islem sekmesine gec
  useEffect(() => {
    if (ticket) setTab('trade')
  }, [ticket])

  return (
    <div className="flex h-screen flex-col bg-bn-bg text-bn-txt">
      <MobileTopbar onSymbolTap={() => setTab('markets')} />

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'markets' && <MarketsSidebar onSelect={() => setTab('chart')} />}
        {tab === 'chart' && <ChartPanel />}
        {tab === 'book' && (
          <div className="grid h-full grid-rows-2">
            <div className="min-h-0 border-b border-bn-line">
              <OrderBook />
            </div>
            <div className="min-h-0">
              <RecentTrades />
            </div>
          </div>
        )}
        {tab === 'trade' && (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto border-b border-bn-line">
              <OrderForm />
            </div>
            <div className="h-44 shrink-0">
              <BalancePanel />
            </div>
          </div>
        )}
        {tab === 'wallet' && <BottomTabs />}
      </div>

      <MobileTabBar value={tab} onChange={setTab} />
    </div>
  )
}
