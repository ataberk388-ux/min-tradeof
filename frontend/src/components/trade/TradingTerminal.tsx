import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { BalancePanel } from '@/components/trade/BalancePanel'
import { BottomTabs } from '@/components/trade/BottomTabs'
import { ChartPanel } from '@/components/trade/ChartPanel'
import { MarketsSidebar } from '@/components/trade/MarketsSidebar'
import { OrderBook } from '@/components/trade/OrderBook'
import { OrderForm } from '@/components/trade/OrderForm'
import { RecentTrades } from '@/components/trade/RecentTrades'
import { SymbolHeader } from '@/components/trade/SymbolHeader'
import { TerminalTopbar } from '@/components/trade/TerminalTopbar'
import { WatchlistBar } from '@/components/trade/WatchlistBar'
import { MarketsPage } from '@/components/pages/MarketsPage'
import { PortfolioPage } from '@/components/pages/PortfolioPage'
import { AlarmsPage } from '@/components/pages/AlarmsPage'
import { useRoute } from '@/hooks/useRoute'

/** Dikey panel kenari (yatay PanelGroup icinde) — surukle ile genislik ayari. */
function VHandle() {
  return (
    <PanelResizeHandle className="w-1 bg-bn-line transition-colors hover:bg-bn-gold data-[resize-handle-state=drag]:bg-bn-gold" />
  )
}

/** Yatay panel kenari (dikey PanelGroup icinde) — surukle ile yukseklik ayari. */
function HHandle() {
  return (
    <PanelResizeHandle className="h-1 bg-bn-line transition-colors hover:bg-bn-gold data-[resize-handle-state=drag]:bg-bn-gold" />
  )
}

/** Masaustu kabuk: kalici ust nav + rotaya gore govde (terminal / markets / portfoy / alarmlar). */
export function DesktopTerminal() {
  const { route } = useRoute()
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bn-bg text-bn-txt">
      <TerminalTopbar />
      {route === 'trade' ? (
        <TradeBody />
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          {route === 'markets' && <MarketsPage />}
          {route === 'portfolio' && <PortfolioPage />}
          {route === 'alarms' && <AlarmsPage />}
        </div>
      )}
    </div>
  )
}

/** Binance spot islem duzeni — surukle ile boyutlandirilabilir paneller. */
function TradeBody() {
  return (
      <>
        <WatchlistBar />
        <SymbolHeader />

        <div className="min-h-0 flex-1">
          <PanelGroup autoSaveId="terminal-h" direction="horizontal">
            {/* Markets */}
            <Panel defaultSize={15} minSize={10}>
              <MarketsSidebar />
            </Panel>
            <VHandle />

            {/* Order book */}
            <Panel defaultSize={17} minSize={12}>
              <OrderBook />
            </Panel>
            <VHandle />

            {/* Orta: grafik + alt sekmeler (dikey boyutlandirilabilir) */}
            <Panel defaultSize={46} minSize={25}>
              <PanelGroup autoSaveId="terminal-center" direction="vertical">
                <Panel defaultSize={68} minSize={25}>
                  <ChartPanel />
                </Panel>
                <HHandle />
                <Panel defaultSize={32} minSize={15}>
                  <BottomTabs />
                </Panel>
              </PanelGroup>
            </Panel>
            <VHandle />

            {/* Sag: emir formu + son islemler + bakiye (dikey boyutlandirilabilir) */}
            <Panel defaultSize={22} minSize={15}>
              <PanelGroup autoSaveId="terminal-right" direction="vertical">
                <Panel defaultSize={46} minSize={20}>
                  <OrderForm />
                </Panel>
                <HHandle />
                <Panel defaultSize={34} minSize={15}>
                  <RecentTrades />
                </Panel>
                <HHandle />
                <Panel defaultSize={20} minSize={12}>
                  <BalancePanel />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>
      </>
  )
}
