import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Ticket {
  price: number
  nonce: number // ayni fiyata tekrar tiklaninca da tetiklensin
}

interface OrderTicketValue {
  ticket: Ticket | null
  fillPrice: (price: number) => void
}

const OrderTicketContext = createContext<OrderTicketValue | null>(null)

/** Order book'tan al/sat formuna fiyat aktarmak icin paylasilan kanal. */
export function OrderTicketProvider({ children }: { children: ReactNode }) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const fillPrice = useCallback((price: number) => {
    setTicket((t) => ({ price, nonce: (t?.nonce ?? 0) + 1 }))
  }, [])
  return (
    <OrderTicketContext.Provider value={{ ticket, fillPrice }}>
      {children}
    </OrderTicketContext.Provider>
  )
}

export function useOrderTicket(): OrderTicketValue {
  const ctx = useContext(OrderTicketContext)
  if (!ctx) throw new Error('useOrderTicket, OrderTicketProvider içinde kullanılmalı')
  return ctx
}
