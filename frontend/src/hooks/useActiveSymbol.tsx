import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ActiveSymbolValue {
  symbol: string
  /** Hizli gecislerde Binance'i bogmamak icin gecikmeli (debounced) sembol. Veri akislari bunu kullanir. */
  debouncedSymbol: string
  setSymbol: (s: string) => void
}

const ActiveSymbolContext = createContext<ActiveSymbolValue | null>(null)

/** Secili islem cifti: sidebar -> grafik/orderbook/trades/form hepsini yonetir. */
export function ActiveSymbolProvider({ children }: { children: ReactNode }) {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [debouncedSymbol, setDebouncedSymbol] = useState(symbol)

  // Kullanici secimde durunca (250ms) veri akislarini tek seferde tetikle.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSymbol(symbol), 250)
    return () => clearTimeout(t)
  }, [symbol])

  return (
    <ActiveSymbolContext.Provider value={{ symbol, debouncedSymbol, setSymbol }}>
      {children}
    </ActiveSymbolContext.Provider>
  )
}

export function useActiveSymbol(): ActiveSymbolValue {
  const ctx = useContext(ActiveSymbolContext)
  if (!ctx) throw new Error('useActiveSymbol, ActiveSymbolProvider içinde kullanılmalı')
  return ctx
}
