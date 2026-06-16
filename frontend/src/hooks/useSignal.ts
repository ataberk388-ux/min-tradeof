import { useQuery } from '@tanstack/react-query'
import { fetchKlines } from '@/lib/binance'
import { computeSignal, type Signal } from '@/lib/indicators'

/**
 * Bir sembol icin teknik sinyal (AL/SAT/BEKLE). 1 saatlik mumlardan RSI+MACD+MA
 * birlestirir. Sembol basina 2 dk cache.
 */
export function useSignal(symbol: string): Signal | null {
  const { data } = useQuery({
    queryKey: ['signal', symbol],
    queryFn: async () => {
      const candles = await fetchKlines(symbol, '1h', 120)
      return computeSignal(candles.map((c) => c.close))
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
  return data ?? null
}
