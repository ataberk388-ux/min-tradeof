/** Teknik indikatör hesaplari (kapanis fiyatlari uzerinden). null = veri yetersiz. */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    out.push(i >= period - 1 ? sum / period : null)
  }
  return out
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = []
  const k = 2 / (period + 1)
  let prev: number | null = null
  let seed = 0
  for (let i = 0; i < values.length; i++) {
    seed += values[i]
    if (i < period - 1) {
      out.push(null)
    } else if (i === period - 1) {
      prev = seed / period
      out.push(prev)
    } else {
      prev = values[i] * k + (prev as number) * (1 - k)
      out.push(prev)
    }
  }
  return out
}

export interface Bollinger {
  upper: (number | null)[]
  middle: (number | null)[]
  lower: (number | null)[]
}

export function bollinger(values: number[], period = 20, mult = 2): Bollinger {
  const middle = sma(values, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    const m = middle[i]
    if (m == null) {
      upper.push(null)
      lower.push(null)
      continue
    }
    let variance = 0
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - m) ** 2
    const std = Math.sqrt(variance / period)
    upper.push(m + mult * std)
    lower.push(m - mult * std)
  }
  return { upper, middle, lower }
}

/** RSI (Wilder). 0-100. */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = []
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(null)
      continue
    }
    const change = values[i] - values[i - 1]
    const gain = Math.max(change, 0)
    const loss = Math.max(-change, 0)
    if (i <= period) {
      avgGain += gain
      avgLoss += loss
      if (i === period) {
        avgGain /= period
        avgLoss /= period
        out.push(100 - 100 / (1 + avgGain / (avgLoss || 1e-9)))
      } else {
        out.push(null)
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      out.push(100 - 100 / (1 + avgGain / (avgLoss || 1e-9)))
    }
  }
  return out
}
