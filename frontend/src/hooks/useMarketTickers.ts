import { useQuery } from '@tanstack/react-query'
import { fetchTickers, type Ticker24h } from '@/lib/binance'

/**
 * Tum USDT ciftlerinin 24s istatistikleri (markets sidebar icin). Binance REST'ten
 * 4 saniyede bir tazelenir; hacme gore azalan sirali.
 */
export function useMarketTickers() {
  return useQuery({
    queryKey: ['binance', 'tickers'],
    queryFn: fetchTickers,
    refetchInterval: 4000,
    select: (all): Ticker24h[] =>
      all
        .filter((t) => t.symbol.endsWith('USDT') && t.quoteVolume > 0)
        .sort((a, b) => b.quoteVolume - a.quoteVolume),
  })
}
