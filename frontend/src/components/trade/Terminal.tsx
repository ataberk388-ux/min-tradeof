import { DesktopTerminal } from '@/components/trade/TradingTerminal'
import { MobileTerminal } from '@/components/trade/MobileTerminal'
import { CommandPalette } from '@/components/trade/CommandPalette'
import { ActiveSymbolProvider } from '@/hooks/useActiveSymbol'
import { OrderTicketProvider } from '@/hooks/useOrderTicket'
import { useAlarmStream } from '@/hooks/useAlarmStream'
import { useExchangeInfo } from '@/hooks/useExchangeInfo'
import { useIsMobile } from '@/hooks/useIsMobile'

/**
 * Terminal kabugu: ortak provider'lar + akislar, sonra ekran genisligine gore
 * masaustu (panel duzeni) ya da mobil (alt sekme) duzeni. Ayni bilesenler yeniden kullanilir.
 */
export function Terminal() {
  useAlarmStream()
  useExchangeInfo()
  const isMobile = useIsMobile()

  return (
    <ActiveSymbolProvider>
      <OrderTicketProvider>
        {isMobile ? <MobileTerminal /> : <DesktopTerminal />}
        <CommandPalette />
      </OrderTicketProvider>
    </ActiveSymbolProvider>
  )
}
