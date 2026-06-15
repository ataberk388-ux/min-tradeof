import { useEffect, useState } from 'react'

/**
 * Coin logosu (public CoinCap ikon CDN'i, ticker bazli). Bulunamazsa baz harfli renkli
 * daireye duser. <img> oldugu icin CORS gerekmez.
 */
export function CoinIcon({ asset, size = 16 }: { asset: string; size?: number }) {
  const [error, setError] = useState(false)
  const lower = asset.toLowerCase()

  // Sembol degisince hata durumunu sifirla
  useEffect(() => setError(false), [lower])

  if (error) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-bn-line text-[9px] font-bold text-bn-sub"
        style={{ width: size, height: size }}
      >
        {asset.charAt(0)}
      </span>
    )
  }

  return (
    <img
      src={`https://assets.coincap.io/assets/icons/${lower}@2x.png`}
      onError={() => setError(true)}
      width={size}
      height={size}
      alt={asset}
      className="shrink-0 rounded-full"
      loading="lazy"
    />
  )
}
