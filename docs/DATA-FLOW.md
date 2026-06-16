# 📊 Crypto Spot Terminal — Veri Akışı (Genel Bakış)

Projedeki verinin nereden çıkıp nereye gittiğinin **kuşbakışı** özeti. (Satır-satır,
fonksiyon-fonksiyon ayrıntı geliştirici notlarında tutulur.)

---

## Kuşbakışı mimari

```
┌─────────────────────────────┐         ┌──────────────────────────────────────┐
│   TARAYICI (React + TS)      │  REST   │   BACKEND (Spring Boot, :8080)        │
│  • Terminal UI / TanStack Q  │ ──────► │  Controller ► Service ► Repo/Store    │
│  • EventSource (SSE)         │ ◄────── │  RuleEngine ◄ AlarmStore (RAM)       │
└──────┬──────────────────────┘  (JWT)  │  PaperTradeService + OrderMatcher     │
       │ (piyasa verisi doğrudan)        │  BinanceWebSocketClient (ingestion)  │
       ▼                                 └──────┬───────────────────┬───────────┘
  Binance REST/WS · CoinGecko                   │ (canlı tick)      │ (JPA)
                                          Binance WS          PostgreSQL (Flyway)
```

**Altın kural:** Ağır/anonim piyasa verisi (grafik, order book, trades, markets, coin bilgi)
tarayıcıdan **doğrudan** Binance/CoinGecko'ya gider. Backend yalnız **bize ait** olanı yönetir:
kimlik, alarmlar, paper-portföy.

---

## Thread bölgeleri (kabaca)

| # | Thread | İş |
|---|--------|----|
| ① | Tomcat `nio-exec-*` | HTTP istekleri: Controller→Service→JPA |
| ② | WebSocket IO | Binance tick'leri (RuleEngine/PriceCache/Metrics) — **sıcak yol** |
| ③ | `@Async` (notificationExecutor) | Alarm tetik sonrası bildirim/DB/SSE |
| ④ | `@Scheduled` | OrderMatcher (3sn), PricePublisher (1sn), Metrics (1sn) |
| ⑤ | ws-reconnect | WS kopunca üstel geri çekilme |

② asla bloklanmaz; yan etki ③/④'e devreder. Paylaşımlı yapılar: `ConcurrentHashMap`,
`CopyOnWriteArrayList`, `AtomicBoolean`.

---

## Ana akışlar (özet)

1. **Auth** — `POST /api/auth/register|login` → BCrypt + JWT (userId claim). Sonraki isteklerde
   axios `Bearer` header; `SecurityConfig` JWT doğrular, controller `userId`'yi claim'den okur.

2. **Piyasa verisi** — `lib/binance.ts` doğrudan Binance WS/REST (kline, depth, trade, ticker);
   coin bilgi CoinGecko. Backend devrede değil.

3. **Alarm** — `create`: DB + RAM `AlarmStore` + WS'e dinamik abonelik. **Sıcak yol**: her tick →
   `RuleEngine` → `AlarmStore.getBySymbol` (O(1)) → `isTriggeredBy` → `tryClaimTrigger` (CAS,
   tam-bir-kez) → `@Async NotificationService` → DB pasifleştir + **SSE** push →
   tarayıcıda toast + OS bildirimi.

4. **Paper – Market** — `PaperTradeService.place`: fiyatı **sunucuda** Binance REST'ten çek →
   `applyFill` (bakiye/pozisyon, ortalama-maliyet) → FILLED.

5. **Paper – Limit** — emir OPEN bekler; `PaperOrderMatcher` (@Scheduled 3sn) açık limitleri
   canlı fiyata karşı tarar, çizgi geçilince **sunucuda** doldurur (otorite sunucuda).

6. **Stop-Limit / OCO** — client-side tetik (`useConditionalWatcher`) → tetiklenince LIMIT emir
   açar → #5 sunucu matcher devralır.

7. **Portföy/PnL** — `usePortfolioValue` pozisyonları canlı fiyatla zenginleştirir (gerçekleşmemiş
   PnL, equity). Analiz sekmesi FILLED emirlerden gerçekleşmiş PnL + win-rate hesaplar.

8. **Canlı fiyat** — `PriceCache` (RAM) → `PricePublisher` (@Scheduled 1sn throttle) → SSE.

9. **Metrikler** — `MetricsConfig` gauge'lar + sayaçlar → `/actuator/prometheus`.

10. **Şema** — Flyway `V1__init.sql` + `ddl-auto: validate` (drift kontrolü).

---

## Hangi teknoloji, nerede, neden

| Teknoloji | Nerede | Neden |
|-----------|--------|-------|
| Spring Security + JWT | `SecurityConfig`, `JwtService` | Stateless, ölçeklenir |
| BCrypt | `AuthService` | Salt'lı, brute-force'a dirençli |
| `jakarta.websocket` | `BinanceWebSocketClient` | Kalıcı bağlantı + dinamik SUBSCRIBE |
| In-memory store | `InMemoryAlarmStore` | Sıcak yolda DB yok; arayüzle taşınabilir |
| `AtomicBoolean` CAS | `Alarm.tryClaimTrigger` | Tam-bir-kez tetik |
| `@Async` | `NotificationService` | Sıcak yolu bloklamayan yan etki |
| SSE | `AlarmEventPublisher`, `PricePublisher` | Tek yönlü push; WS'ten hafif |
| `@Scheduled` | `PaperOrderMatcher`, `PricePublisher` | Periyodik dolum/yayın |
| Flyway | `db/migration` | Versiyonlu, geri-alınabilir şema |
| Micrometer/Prometheus | `MetricsConfig` | Gözlemlenebilirlik |
| Testcontainers | `AbstractIntegrationTest` | Gerçek DB'ye karşı test |
| TanStack Query | `hooks/` | Server-state cache + refetch |
| lightweight-charts | `ChartPanel` | Hafif TradingView grafiği |

---

*github.com/ataberk388-ux/min-tradeof — Java 21 · Spring Boot 3.5 · React 19 · PostgreSQL 16*
