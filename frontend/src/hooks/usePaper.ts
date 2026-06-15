import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelOrder,
  fillOrder,
  getPaperOrders,
  getPortfolio,
  placeOrder,
  resetPaper,
} from '@/lib/paper'

const PAPER_KEY = ['paper'] as const

export function usePortfolio() {
  return useQuery({
    queryKey: ['paper', 'portfolio'],
    queryFn: getPortfolio,
    refetchInterval: 4000,
  })
}

export function usePaperOrders() {
  return useQuery({
    queryKey: ['paper', 'orders'],
    queryFn: getPaperOrders,
    refetchInterval: 4000,
  })
}

function useInvalidatingMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAPER_KEY }),
  })
}

export function usePlaceOrder() {
  return useInvalidatingMutation(placeOrder)
}

export function useFillOrder() {
  return useInvalidatingMutation(fillOrder)
}

export function useCancelOrder() {
  return useInvalidatingMutation(cancelOrder)
}

export function useResetPaper() {
  return useInvalidatingMutation(resetPaper)
}
