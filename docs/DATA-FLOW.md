# 📊 Crypto Spot Terminal — Veri Akışı (Data Flow) Rehberi

Bu doküman, projedeki **her verinin nereden çıkıp nereye gittiğini** gerçek sınıf/dosya
adlarıyla anlatır. Mülakatta "bana mimarini anlat" denince bu sıralamayı takip edebilirsin.

---

## 0) Kuşbakışı mimari

```
┌─────────────────────────────┐         ┌──────────────────────────────────────┐
│   TARAYICI (React + TS)      │         │   BACKEND (Spring Boot, :8080)        │
│                             │         │                                      │
│  • Terminal UI              │  REST   │  AuthController / AccountController   │
│  • TanStack Query (cache)   │ ──────► │  AlarmController / PaperController    │
│  • EventSource (SSE)        │ ◄────── │  SSE: AlarmEventPublisher/PricePub.   │
└──────┬───────────────┬──────┘  (JWT)  │  RuleEngine ◄ AlarmStore (RAM)       │
       │               │                │  PaperTradeService + PaperOrderMatcher│
       │ (doğrudan)    │                │  BinanceWebSocketClient (ingestion)  │
       ▼               │                └───────┬──────────────────┬───────────┘
┌──────────────┐       │                        │                  │
│ Binance      │◄──────┘ (grafik/orderbook/     │ (canlı tick)     │ (JPA)
│ public REST  │         trades/markets         ▼                  ▼
│ + WebSocket  │         DOĞRUDAN tarayıcıdan)  Binance WS    ┌──────────────┐
└──────────────┘                                              │ PostgreSQL   │
                                                              │ (Flyway şema)│
┌──────────────┐  (coin bilgi paneli)                         └──────────────┘
│ CoinGecko    │◄───── doğrudan tarayıcıdan
└──────────────┘
```

**Altın kural:** Ağır/anonim **piyasa verisi** (grafik, order book, trades, markets, coin bilgi)
tarayıcıdan **doğrudan** Binance/CoinGecko'ya gider — backend'i meşgul etmez. Backend yalnız
**bize ait** olanı yönetir: kimlik, alarmlar, paper-portföy.

---

## 1) Kimlik Doğrulama (Auth)

**Amaç:** Stateless JWT ile çok kullanıcılı, izole oturum.

```
[Kayıt/Giriş formu]  POST /api/auth/register | /login   (AuthForm.tsx → lib/api.ts)
        │
        ▼
AuthController ──► AuthService
        │            • register: BCrypt ile şifre hash'le, User'ı DB'ye yaz
        │            • login: BCrypt.matches ile doğrula
        │            • JwtService.issue(user) → imzalı JWT (userId claim'i içinde)
        ▼
AuthResponse { token, username }
        │
        ▼
Tarayıcı token'ı saklar (localStorage, lib/auth.ts)
        │
        ▼
Sonraki her istek: axios interceptor "Authorization: Bearer <token>" ekler (lib/api.ts)
        │
        ▼
SecurityConfig: /api/auth/** + /actuator/health,prometheus = açık; gerisi JWT ister.
Controller'lar @AuthenticationPrincipal Jwt'den userId claim'ini okur → veri izolasyonu.
```

- **Şifre değiştir:** `POST /api/account/password` → `AccountController` → `AuthService.changePassword`
  (mevcut şifre BCrypt ile doğrulanır, yeni hash yazılır). `/api/account/**` kimlik ister.

---

## 2) Piyasa Verisi — İki Ayrı Kanal

### 2a) Tarayıcı → Binance (doğrudan, backend yok)
`frontend/src/lib/binance.ts` tüm bunları **doğrudan** Binance'ten çeker:

| Veri | Kaynak | Kullanan |
|------|--------|----------|
| Mum grafiği | `@kline` WS + `/klines` REST | `ChartPanel` |
| Order book | `@depth20@100ms` WS | `OrderBook` |
| Son işlemler | `@trade` WS + `/trades` REST | `RecentTrades`, `OrderBook` (son fiyat) |
| 24s ticker (markets) | `/ticker/24hr` REST (4 sn) | `useMarketTickers` → Markets, Watchlist, arama |
| Sembol başlığı | `@ticker` WS | `SymbolHeader` |
| Coin bilgi | CoinGecko `/coins/{id}` | `useCoinInfo` → `CoinInfoPanel` |

> Port notu: WS `:9443` bazı ağlarda kapalı → `:443` kullanılır (REST gibi her yerde açık).

### 2b) Backend → Binance (alarm motoru için ingestion)
`BinanceWebSocketClient` kalıcı bir WS bağlantısı tutar:
```
ApplicationReadyEvent → connect() → onOpen → subscribe(tüm semboller @trade + @ticker)
        │
        ▼ (her mesaj)
BinancePriceParser.parse() → PriceTick { symbol, price, changePercent? }
        │
        ▼ (her tick TÜM handler'lara dağıtılır)
   ┌────────────────┬──────────────────┬────────────────┐
   ▼                ▼                  ▼
RuleEngine     PriceCache         MetricsTracker
(alarm eşleştir) (son fiyat snapshot) (tick sayacı)
```
Kopma olursa **üstel geri çekilme** (exponential backoff) ile yeniden bağlanır.

---

## 3) Fiyat Alarmı — Projenin En Kritik Akışı

### 3a) Alarm kurma
```
[AlarmForm] POST /api/alarms  { symbol, targetPrice, direction, type }
        │
        ▼
AlarmController → AlarmService.create(userId)
        │   1. DB'ye yaz (kalıcı)
        │   2. AlarmStore.add()  → RAM cache'e ekle (sıcak yol buradan okur)
        │   3. BinanceWebSocketClient.ensureSubscribed(symbol)
        │      → feed o sembolü takip etmiyorsa ANINDA SUBSCRIBE gönder (dinamik ingestion)
        ▼
AlarmResponse → listede görünür (TanStack Query cache invalidate)
```

### 3b) Tetikleme (yüksek-throughput sıcak yol)
```
Binance @trade/@ticker tick ──► BinanceWebSocketClient ──► RuleEngine.handle(tick)
        │
        ▼
AlarmStore.getBySymbol(tick.symbol)   ← O(1) lookup (ConcurrentHashMap)
        │
        ▼ (her alarm için)
alarm.isTriggeredBy(price, changePercent)?   ← PRICE: fiyat | PERCENT: 24s % eşiği
        │ evet
        ▼
alarm.tryClaimTrigger()   ← AtomicBoolean.compareAndSet → TAM BİR KEZ garantisi
        │ true (ilk kazanan)
        ▼
AlarmStore.remove(alarm)   +   NotificationService.onTriggered(alarm, price)  [@Async]
        │                                   │
        │                                   ├─ DB'de alarmı pasifleştir (triggered_at)
        │                                   ├─ AlarmEventPublisher.publishTriggered(userId, event)
        │                                   └─ meterRegistry.counter("alarm.triggered")++
        ▼
SSE: yalnız alarmın SAHİBİNİN açık bağlantılarına "alarm-triggered" event'i it
```

### 3c) Tarayıcıya ulaşması
```
useAlarmStream (EventSource: /api/alarms/stream?access_token=JWT)
        │  "alarm-triggered" geldi
        ▼
   ├─ Sonner toast ("🔔 ALARM TETİKLENDİ")
   ├─ showSystemNotification() → tarayıcı/OS bildirimi (lib/webpush.ts, service worker)
   ├─ pushNotification() → bildirim zili listesine ekle
   └─ queryClient.invalidateQueries(['alarms']) → liste tazelenir, tetiklenen düşer
```

**Neden bu tasarım?**
- **In-memory store** = okuma DB'ye gitmez, sıcak yol mikrosaniye seviyesinde.
- **CAS guard** = aynı anda iki tick gelse bile alarm bir kez tetiklenir (yarış koşulu yok).
- **@Async** = bildirim/DB işi motoru yavaşlatmaz; motor eşleşmeyi bulur bulmaz devam eder.
- **SSE** = tek yönlü (server→client) akış için WebSocket'ten daha hafif; tarayıcıda
  `EventSource` + otomatik reconnect hazır.

---

## 4) Paper Trading — MARKET Emir (anında dolar)

```
[OrderForm "Al/Sat" + Piyasa]  POST /api/paper/orders { symbol, side, MARKET, qty }
        │
        ▼
PaperController → PaperTradeService.place()
        │   • BinancePriceClient.currentPrice(symbol)  ← fiyatı SUNUCUDA çek (istemciye güvenme!)
        │   • applyFill(): bakiye/pozisyon güncelle (ortalama-maliyet, RoundingMode.HALF_UP)
        │   • order.status = FILLED, fillPrice, filledAt
        │   • meterRegistry.counter("paper.order.placed")++
        ▼
PaperOrder (FILLED) → DB
        │
        ▼
Tarayıcı: usePaper (4 sn poll) portföyü/emirleri tazeler
```

---

## 5) Paper Trading — LIMIT Emir (SUNUCU-TARAFI matcher)

```
[OrderForm + Limit]  POST /api/paper/orders { LIMIT, price, qty }
        │
        ▼
PaperTradeService.place() → order.status = OPEN (bakiyeye dokunmaz, bekler)
        │
        ▼ ───────────── ayrı bir zamanlanmış iş ─────────────
PaperOrderMatcher  @Scheduled(her 3 sn)
        │   1. orderRepo.findByStatusAndType(OPEN, LIMIT)
        │   2. her sembolün anlık fiyatını BinancePriceClient'tan çek (sembol başına 1 kez)
        │   3. fiyat çizgiyi geçtiyse → PaperTradeService.matchAndFill(orderId, price)
        │        • BUY: fiyat ≤ limit | SELL: fiyat ≥ limit  → applyFill + FILLED
        │        • bakiye/pozisyon yetersizse → CANCELLED (sonsuz deneme önlenir)
        ▼
DB güncellenir → tarayıcı poll ile "Doldu" görür
```

> **Neden önemli (eskiden client-side'dı):** Artık dolum otoritesi **sunucuda**. Tarayıcı
> sekmesi kapalı, bilgisayar kapalı olsa bile fiyat hedefe gelince emir dolar. "Demo"yu
> "ciddi servise" taşıyan en kritik değişiklik buydu.

---

## 6) Koşullu Emirler — Stop-Limit / OCO (client-side tetik → server-side dolum)

```
[OrderForm Stop-Limit/OCO]  → addConditional()  (lib/useConditionalOrders.ts, localStorage)
        │  (backend'e gitmez; client-side yönetilir)
        ▼
useConditionalWatcher  (3 sn poll, fetchPrices)
        │  stop/tp seviyesi geçildi mi?
        │     • STOP_LIMIT: stop'a değince → LIMIT emir aç
        │     • OCO: TP veya stop hangisi önce → o leg'i aç, diğerini iptal et (One-Cancels-Other)
        ▼
usePlaceOrder → POST /api/paper/orders (LIMIT)  ──► artık #5'teki sunucu matcher dolduruyor
```
> Tetik client-side (uygulama açıkken), ama LIMIT'e dönüşünce dolum sunucuya devreder.

---

## 7) Portföy & PnL

```
usePortfolio (GET /api/paper/portfolio, 4 sn)  → { usdtBalance, positions[] }
        │
        ▼
usePortfolioValue: pozisyonların CANLI fiyatlarını fetchPrices ile çek (3 sn)
        │   • value = qty × currentPrice
        │   • pnl = value − (avgPrice × qty)   (gerçekleşmemiş)
        │   • equity = USDT + Σ pozisyon değeri
        ▼
BalancePanel / PortfolioPage / BottomTabs(Pozisyonlar)

Analiz sekmesi (useTradeAnalytics): FILLED emirlerden ortalama-maliyet yöntemiyle
GERÇEKLEŞMİŞ PnL, win-rate, en iyi/kötü işlem, günlük PnL → recharts grafikleri.
```

---

## 8) Canlı Fiyat Yayını (PriceCache → SSE)

```
Binance tick → PriceCache (her sembolün son fiyatı, RAM)
        │
        ▼
PricePublisher  @Scheduled(her 1 sn)  ← throttle (tick saniyede onlarca gelse de 1 yayın)
        │   snapshot'ı tüm abonelere "prices" event'i ile it
        ▼
Tarayıcı EventSource → fiyatlar (kullanıcıya özel değil, ortak yayın)
```

---

## 9) Metrikler (Micrometer → Prometheus)

```
MetricsConfig (MeterBinder) gauge'lar:
  • alarm.engine.ticks_per_second   ← MetricsTracker
  • alarm.engine.ticks_total
  • alarm.active                    ← AlarmStore.activeCount()
  • exchange.ws.connected (1/0)     ← BinanceWebSocketClient.isConnected()
Sayaçlar:
  • alarm.triggered                 ← NotificationService
  • paper.order.placed{type,side}   ← PaperTradeService
        │
        ▼
GET /actuator/prometheus  → Prometheus çeker → Grafana çizer
```

---

## 10) Şema Yönetimi (Flyway)

```
Uygulama açılışı:
  Flyway → db/migration/V1__init.sql çalıştır (versiyonlu, kalıcı)
        │   • boş DB: V1 tabloları kurar
        │   • mevcut DB: baseline-on-migrate → V1 atlanır, baseline'lanır
        ▼
  Hibernate ddl-auto: validate → entity ↔ şema uyumunu DOĞRULAR (drift yakalar)
```
> Eskiden `ddl-auto: update` (Hibernate şemayı kafasına göre değiştirirdi). Artık şema
> sahibi Flyway; her değişiklik `V2__...sql`, `V3__...sql` olarak izlenir/geri alınabilir.

---

## 11) Test Akışı (doğrulama)

```
./gradlew test
   ├─ Unit (Mockito): PaperTradeServiceTest, RuleEngineTest   → izole mantık, DB yok
   └─ Integration (Testcontainers): AuthControllerIT, contextLoads
         → gerçek PostgreSQL konteyneri (@ServiceConnection) + Flyway + Spring context
         → Docker yoksa zarifçe ATLANIR (@Testcontainers disabledWithoutDocker)
GitHub Actions (.github/workflows/ci.yml): her push'ta ubuntu'da otomatik koşar.
```

---

## Tasarım Kararları — Tek Bakışta

| Karar | Neden |
|-------|-------|
| Piyasa verisi doğrudan Binance'ten (tarayıcı) | Backend'i ağır/anonim trafikten kurtarır |
| In-memory AlarmStore (RAM) | Sıcak yolda DB okuması yok → mikrosaniye eşleştirme |
| `AtomicBoolean.compareAndSet` | Eşzamanlı tick'lerde **tam bir kez** tetikleme |
| `@Async` bildirim | Motor bildirimi/DB'yi beklemez, throughput korunur |
| SSE (WebSocket değil) | Tek yönlü akış için daha az kod + tarayıcı reconnect'i hazır |
| Sunucu-tarafı LIMIT matcher | Dolum otoritesi sunucuda; sekme kapalı olsa da çalışır |
| Dinamik WS aboneliği | Feed sabit listeyle sınırlı değil; alarm kurulan her sembol |
| Flyway + validate | Şema versiyonlu, geri alınabilir; drift derhal yakalanır |
| Testcontainers | Gerçek DB'ye karşı test, sıfır kurulum, her yerde çalışır |

---

*Proje: github.com/ataberk388-ux/min-tradeof — Java 21 · Spring Boot 3.5 · React 19 · PostgreSQL*
