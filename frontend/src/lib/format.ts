const priceFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Fiyati okunur sekilde bicimler: 107432.1 -> "107,432.10". */
export function formatPrice(value: number): string {
  return priceFmt.format(value)
}

/** Buyukluge gore degisken ondalik (Binance tarzi): 107432.10 / 2.4567 / 0.000123. */
export function formatNum(value: number, decimals?: number): string {
  const d = decimals ?? (value >= 1000 ? 2 : value >= 1 ? 4 : 6)
  return value.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

/** Hacim/buyuk sayi: 1.2B, 345.6M, 12.3K. */
export function formatCompact(value: number): string {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}
