/**
 * CoinGecko public market verisi (anahtarsiz). Coin "Bilgi" paneli icin: market cap,
 * arz, ATH/ATL, aciklama, linkler. Binance sembolu (BTC) -> CoinGecko id (bitcoin) esleme
 * statik tutulur (sembol cakismalarini onlemek icin en saglikli yol).
 */

/** Binance baz varlik -> CoinGecko coin id. En cok islem goren ~60 varlik. */
export const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana', XRP: 'ripple',
  ADA: 'cardano', DOGE: 'dogecoin', TRX: 'tron', AVAX: 'avalanche-2', SHIB: 'shiba-inu',
  DOT: 'polkadot', LINK: 'chainlink', MATIC: 'matic-network', POL: 'polygon-ecosystem-token',
  TON: 'the-open-network', LTC: 'litecoin', BCH: 'bitcoin-cash', NEAR: 'near', UNI: 'uniswap',
  APT: 'aptos', ICP: 'internet-computer', XLM: 'stellar', ATOM: 'cosmos', ETC: 'ethereum-classic',
  FIL: 'filecoin', HBAR: 'hedera-hashgraph', VET: 'vechain', ARB: 'arbitrum', OP: 'optimism',
  IMX: 'immutable-x', INJ: 'injective-protocol', SUI: 'sui', SEI: 'sei-network', RUNE: 'thorchain',
  AAVE: 'aave', GRT: 'the-graph', ALGO: 'algorand', FTM: 'fantom', SAND: 'the-sandbox',
  MANA: 'decentraland', AXS: 'axie-infinity', THETA: 'theta-token', EOS: 'eos', FLOW: 'flow',
  XTZ: 'tezos', CHZ: 'chiliz', EGLD: 'elrond-erd-2', KAVA: 'kava', MKR: 'maker', SNX: 'havven',
  CRV: 'curve-dao-token', LDO: 'lido-dao', RNDR: 'render-token', PEPE: 'pepe', WIF: 'dogwifcoin',
  FLOKI: 'floki', BONK: 'bonk', JUP: 'jupiter-exchange-solana', PYTH: 'pyth-network',
  TIA: 'celestia', STX: 'blockstack', GALA: 'gala', ENS: 'ethereum-name-service',
}

export interface CoinInfo {
  name: string
  symbol: string
  image: string | null
  marketCap: number | null
  marketCapRank: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null
  ath: number | null
  athDate: string | null
  atl: number | null
  atlDate: string | null
  description: string | null
  homepage: string | null
  genesisDate: string | null
}

/** Bir baz varlik icin CoinGecko'dan zengin bilgi. Eslestirme yoksa null. */
export async function fetchCoinInfo(asset: string): Promise<CoinInfo | null> {
  const id = COIN_IDS[asset.toUpperCase()]
  if (!id) return null
  const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error('CoinGecko bilgisi alınamadı')
  const d = (await res.json()) as Record<string, any>
  const md = d.market_data ?? {}
  // Aciklamayi sadelestir: HTML linklerini at, ilk ~2 cumle.
  const rawDesc: string = d.description?.en ?? ''
  const desc = rawDesc.replace(/<[^>]*>/g, '').trim()
  return {
    name: d.name,
    symbol: (d.symbol ?? '').toUpperCase(),
    image: d.image?.small ?? null,
    marketCap: md.market_cap?.usd ?? null,
    marketCapRank: d.market_cap_rank ?? null,
    circulatingSupply: md.circulating_supply ?? null,
    totalSupply: md.total_supply ?? null,
    maxSupply: md.max_supply ?? null,
    ath: md.ath?.usd ?? null,
    athDate: md.ath_date?.usd ?? null,
    atl: md.atl?.usd ?? null,
    atlDate: md.atl_date?.usd ?? null,
    description: desc ? desc.split('. ').slice(0, 2).join('. ') + (desc.includes('.') ? '.' : '') : null,
    homepage: d.links?.homepage?.find((h: string) => h) ?? null,
    genesisDate: d.genesis_date ?? null,
  }
}
