import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchPrices } from '@/lib/binance'
import { usePlaceOrder } from '@/hooks/usePaper'
import { pushNotification } from '@/hooks/useNotifications'
import { removeConditional, useConditionalOrders, type ConditionalOrder } from '@/hooks/useConditionalOrders'

/** Bu koşullu emir tetiklendi mi? (yon + leg'e gore). */
function triggered(o: ConditionalOrder, price: number): { fire: true; limit: number } | null {
  if (o.kind === 'STOP_LIMIT') {
    const hit = o.side === 'BUY' ? price >= o.stopPrice : price <= o.stopPrice
    return hit ? { fire: true, limit: o.limitPrice } : null
  }
  // OCO: take-profit VEYA stop-loss
  if (o.tpPrice != null) {
    const tpHit = o.side === 'SELL' ? price >= o.tpPrice : price <= o.tpPrice
    if (tpHit) return { fire: true, limit: o.tpPrice }
  }
  const stopHit = o.side === 'SELL' ? price <= o.stopPrice : price >= o.stopPrice
  return stopHit ? { fire: true, limit: o.limitPrice } : null
}

/**
 * Acik koşullu emirlerin sembollerini canli fiyatla izler; stop/tp seviyesine gelince
 * gercek bir LIMIT emri acar ve koşullu emri kaldirir. Terminal kabugu icinde bir kez monte edilir.
 */
export function useConditionalWatcher() {
  const { orders } = useConditionalOrders()
  const place = usePlaceOrder()
  const firedRef = useRef<Set<string>>(new Set())

  const symbols = [...new Set(orders.map((o) => o.symbol))]
  const { data: prices } = useQuery({
    queryKey: ['binance', 'conditional-prices', [...symbols].sort().join(',')],
    queryFn: () => fetchPrices(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 3000,
  })

  useEffect(() => {
    if (!prices) return
    for (const o of orders) {
      if (firedRef.current.has(o.id)) continue
      const price = prices[o.symbol]
      if (price == null) continue
      const t = triggered(o, price)
      if (!t) continue
      firedRef.current.add(o.id)
      const asset = o.symbol.replace(/USDT$/, '')
      place.mutate(
        { symbol: o.symbol, side: o.side, type: 'LIMIT', qty: o.qty, price: t.limit },
        {
          onSuccess: () => {
            const label = o.kind === 'OCO' ? 'OCO' : 'Stop-Limit'
            toast.success(`${label} tetiklendi: ${asset} → LIMIT emir açıldı`)
            pushNotification(`${label} tetiklendi: ${asset}`)
            removeConditional(o.id)
          },
          onError: () => {
            // Basarisizsa tekrar denenebilsin diye fired isaretini geri al
            firedRef.current.delete(o.id)
          },
        },
      )
    }
  }, [prices, orders, place])
}
