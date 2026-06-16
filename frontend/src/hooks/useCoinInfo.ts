import { useQuery } from '@tanstack/react-query'
import { fetchCoinInfo } from '@/lib/coingecko'

/** Baz varlik (BTC) icin CoinGecko zengin bilgisi. 5 dk cache (REST hafif kullanim). */
export function useCoinInfo(asset: string, enabled = true) {
  return useQuery({
    queryKey: ['coingecko', 'info', asset],
    queryFn: () => fetchCoinInfo(asset),
    enabled: enabled && !!asset,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
