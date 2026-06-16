import { ExternalLink, X } from 'lucide-react'
import { useCoinInfo } from '@/hooks/useCoinInfo'
import { CoinIcon } from '@/components/trade/CoinIcon'
import { formatCompact } from '@/lib/format'

/** Sembol basligindan acilan coin bilgi cekmecesi (Binance "Bilgi" sekmesi esinli). */
export function CoinInfoPanel({ asset, onClose }: { asset: string; onClose: () => void }) {
  const { data, isLoading, isError } = useCoinInfo(asset)

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-bn-line bg-bn-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bn-line px-4 py-3">
          <span className="flex items-center gap-2 font-semibold text-bn-txt">
            <CoinIcon asset={asset} size={22} />
            {asset} Bilgi
          </span>
          <button onClick={onClose} className="text-bn-sub transition hover:text-bn-txt" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-4">
          {isLoading && <p className="py-10 text-center text-sm text-bn-sub">Yükleniyor…</p>}
          {(isError || (!isLoading && !data)) && (
            <p className="py-10 text-center text-sm text-bn-sub">
              Bu varlık için detaylı bilgi bulunamadı.
            </p>
          )}

          {data && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                {data.image ? (
                  <img src={data.image} alt={data.name} className="h-9 w-9 rounded-full" />
                ) : (
                  <CoinIcon asset={asset} size={36} />
                )}
                <div>
                  <p className="font-semibold text-bn-txt">{data.name}</p>
                  <p className="text-xs text-bn-sub">
                    {data.symbol}
                    {data.marketCapRank != null && (
                      <span className="ml-2 rounded bg-bn-line px-1.5 py-0.5 text-[10px] text-bn-gold">
                        Sıralama #{data.marketCapRank}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Piyasa Değeri" value={data.marketCap != null ? `$${formatCompact(data.marketCap)}` : '—'} />
                <Stat label="Dolaşan Arz" value={data.circulatingSupply != null ? formatCompact(data.circulatingSupply) : '—'} />
                <Stat label="Toplam Arz" value={data.totalSupply != null ? formatCompact(data.totalSupply) : '—'} />
                <Stat label="Maks. Arz" value={data.maxSupply != null ? formatCompact(data.maxSupply) : '∞'} />
                <Stat
                  label="ATH (en yüksek)"
                  value={data.ath != null ? `$${formatCompact(data.ath)}` : '—'}
                  sub={data.athDate ? new Date(data.athDate).toLocaleDateString('tr-TR') : undefined}
                />
                <Stat
                  label="ATL (en düşük)"
                  value={data.atl != null ? `$${formatCompact(data.atl)}` : '—'}
                  sub={data.atlDate ? new Date(data.atlDate).toLocaleDateString('tr-TR') : undefined}
                />
              </div>

              {data.description && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-bn-sub">Hakkında</p>
                  <p className="text-sm leading-relaxed text-bn-txt">{data.description}</p>
                </div>
              )}

              {data.homepage && (
                <a
                  href={data.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-bn-line px-3 py-1.5 text-sm text-bn-gold transition hover:bg-bn-line"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Resmi site
                </a>
              )}

              <p className="text-[10px] text-bn-sub">Veri: CoinGecko</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-bn-line bg-bn-panel2 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-bn-sub">{label}</p>
      <p className="font-mono text-sm text-bn-txt">{value}</p>
      {sub && <p className="text-[10px] text-bn-sub">{sub}</p>}
    </div>
  )
}
