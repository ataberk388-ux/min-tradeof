import api from '@/lib/api'

export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT'
export type OrderStatus = 'OPEN' | 'FILLED' | 'CANCELLED'

export interface Position {
  asset: string
  qty: number
  avgPrice: number
}

export interface Portfolio {
  usdtBalance: number
  positions: Position[]
}

export interface PaperOrder {
  id: number
  symbol: string
  side: OrderSide
  type: OrderType
  price: number | null
  qty: number
  status: OrderStatus
  fillPrice: number | null
  createdAt: string
  filledAt: string | null
}

export interface PlaceOrderInput {
  symbol: string
  side: OrderSide
  type: OrderType
  price?: number
  qty: number
}

export async function getPortfolio(): Promise<Portfolio> {
  const { data } = await api.get<Portfolio>('/paper/portfolio')
  return data
}

export async function getPaperOrders(): Promise<PaperOrder[]> {
  const { data } = await api.get<PaperOrder[]>('/paper/orders')
  return data
}

export async function placeOrder(input: PlaceOrderInput): Promise<PaperOrder> {
  const { data } = await api.post<PaperOrder>('/paper/orders', input)
  return data
}

export async function fillOrder(id: number): Promise<PaperOrder> {
  const { data } = await api.post<PaperOrder>(`/paper/orders/${id}/fill`)
  return data
}

export async function cancelOrder(id: number): Promise<void> {
  await api.delete(`/paper/orders/${id}`)
}

export async function resetPaper(): Promise<void> {
  await api.post('/paper/reset')
}
