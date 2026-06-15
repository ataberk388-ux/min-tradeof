import { useQuery } from '@tanstack/react-query'
import { fetchExchangeInfo } from '@/lib/symbolFormat'

/**
 * Binance exchangeInfo'yu bir kez yukler (sembol ondalik hassasiyetleri icin).
 * Modul cache'ini doldurur; bir daha tazelenmez.
 */
export function useExchangeInfo() {
  return useQuery({
    queryKey: ['binance', 'exchangeInfo'],
    queryFn: async () => {
      await fetchExchangeInfo()
      return true
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
