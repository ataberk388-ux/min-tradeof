# 📊 Crypto Spot Terminal — Detaylı Veri Akışı (Data Flow)

Her akış **adım-adım çağrı zinciri** olarak yazıldı: hangi fonksiyon → hangi metodu (hangi
argümanla) çağırıyor → ne dönüyor → neyi tetikliyor. JSON gövdeleri, veri yapıları ve
**hangi thread'de** çalıştığı dahil. Mülakatta "kod seviyesinde anlat" için bire bir kaynak.

> Gösterim: `Sınıf.metot(arg)` · `[Thread: ...]` · `►` = çağırır/akar · `⇒` = döner

---

## 0) Katmanlar ve sorumluluk

```
Frontend (React/TS)         Backend (Spring Boot)            Dış
─────────────────           ─────────────────────            ───
components/  (UI)            api/        (Controller)         Binance REST/WS
hooks/       (durum)         service/    (iş mantığı)         CoinGecko REST
lib/         (IO: axios/WS)  engine/     (sıcak yol)          PostgreSQL
                            ingestion/  (WS client, cache)
                            notification/ (SSE, async)
                            cache/      (RAM alarm store)
                            domain/     (JPA entity)
                            repository/ (Spring Data JPA)
```

**Bağımlılık yönü:** Controller ► Service ► (Repository | Store | Client). Engine ► Store +
TriggerHandler. WS Client ► tüm `PriceTickHandler`'lar. Hiçbir alt katman üste bağlı değil.

---

## 🧵 Thread modeli — kabaca ayrım (önce bunu oku)

Sistemde **5 ayrı thread bölgesi** var. Her akışta hangi bölgede olduğunu `[Thread: X]` ile işaretledim.

```
① Tomcat işçi thread'leri  (nio-exec-*)
     → Gelen HTTP isteklerini işler: tüm Controller'lar, Service çağrıları, JPA.
     → Her istek bir thread; istek bitince thread havuza döner. SSE açık kalır (async).

② WebSocket IO thread  (jakarta.websocket istemcisi)
     → Binance'ten gelen her tick'i okur: onMessage → parser → RuleEngine/PriceCache/MetricsTracker.
     → SICAK YOL burada. Bloklamak yasak → ağır iş @Async havuzuna atılır.

③ @Async havuzu  (notificationExecutor)
     → Alarm tetiklenince bildirim + DB pasifleştirme + SSE push burada.
     → Motoru (②) yavaşlatmamak için ayrıldı.

④ Scheduling havuzu  (@Scheduled görevleri)
     → PaperOrderMatcher (3sn), PricePublisher.broadcast (1sn), MetricsTracker.sample (1sn).
     → Periyodik, HTTP'den bağımsız.

⑤ ws-reconnect thread  (tek daemon)
     → WS koparsa üstel geri çekilme ile yeniden bağlanmayı zamanlar.

+ Tarayıcı thread'i (frontend): React render + EventSource + axios.
```

**Altın kural:** ② (sıcak yol) asla bloklanmaz; yan etkiler ③/④'e devredilir. Paylaşılan
yapılar (`ConcurrentHashMap`, `CopyOnWriteArrayList`, `AtomicBoolean`) bu thread'ler arası
güvenli erişim içindir → ayrıntı **§12 eşzamanlılık haritası**.

---

## 1) AUTH — Kayıt / Giriş / Yetkili istek

### 1.1 Kayıt
```
[Thread: ⑥ tarayıcı]
AuthForm.tsx onSubmit(values)
  ► lib/api.ts registerUser({username, password})
      ► axios POST /api/auth/register   Body: {"username":"ali","password":"secret123"}
[Thread: ① Tomcat nio-exec-N]
  ► AuthController.register(@Valid RegisterRequest)         // @Valid: username 3-30, password 6-72
      ► AuthService.register(req)            [@Transactional]
          ► userRepository.existsByUsername("ali")  ⇒ false
          ► passwordEncoder.encode("secret123")  ⇒ "$2a$10$..."  (BCrypt, salt'lı)
          ► userRepository.save(new User("ali", hash))  ⇒ User{id=7}
          ► jwtService.issue(user)  ⇒ "eyJhbGci..."  (HS256, claim: sub, userId=7, exp=+7g)
      ⇒ AuthResponse{token, username:"ali"}   HTTP 201
[Thread: ⑥ tarayıcı]
  ◄ lib/auth.ts saveAuth(token, username)  → localStorage
  ◄ useAuth.setAuth() → isAuthenticated=true → App <Terminal/> render
```

### 1.2 Sonraki yetkili istekler (interceptor)
```
lib/api.ts (axios request interceptor):
   her istekte → header "Authorization: Bearer <token>"   (getToken() localStorage'dan)
[Thread: ①] Backend SecurityConfig (filter chain):
   /api/auth/**, /actuator/health, /actuator/prometheus  → permitAll
   diğer her şey → JWT zorunlu (oauth2ResourceServer.jwt)
   JwtDecoder token'ı HMAC secret ile doğrular ⇒ Jwt principal
   Controller: userId(jwt) = ((Number) jwt.getClaim("userId")).longValue()  ⇒ 7
401 olursa: axios response interceptor UNAUTHORIZED_EVENT yayar → useAuth.logout()
```

### 1.3 Şifre değiştir
```
[Thread: ⑥] ProfilePage ► changePassword({currentPassword,newPassword})
  ► POST /api/account/password   [/api/account/** = JWT zorunlu]
[Thread: ①] AccountController.changePassword(req, jwt)
      ► AuthService.changePassword(userId, req)   [@Transactional]
          ► userRepository.findById(7)
          ► passwordEncoder.matches(current, hash)?  hayırsa → InvalidCredentialsException (401)
          ► user.setPasswordHash(encode(new))   // dirty-checking ile UPDATE
  ⇒ 204 No Content
```

---

## 2) PİYASA VERİSİ — Tarayıcı ↔ Binance (backend yok)

`lib/binance.ts` tüm fonksiyonlar **doğrudan** `https://api.binance.com` / `wss://stream.binance.com:443`. [Thread: ⑥ tarayıcı]

```
ChartPanel        ► fetchKlines(sym, "1m", 400)  ⇒ Candle[]      + openKlineStream(sym, "1m", cb)
OrderBook         ► openDepthStream(sym, cb)  → cb({bids,asks})  + openTradeStream (son fiyat)
RecentTrades      ► fetchTrades(sym,40) + openTradeStream(sym, cb)
SymbolHeader      ► openTickerStream(sym, cb) → {last,changePercent,high,low,...}
useMarketTickers  ► fetchTickers() /api/v3/ticker/24hr  [refetchInterval 4000ms]  ⇒ Ticker24h[]
usePortfolioValue ► fetchPrices([BTCUSDT,...]) /ticker/price?symbols=[...]  ⇒ {sym: price}
useCoinInfo       ► CoinGecko /coins/{id}  ⇒ {market_cap, supply, ath...}  [staleTime 5dk]
```

**WS yönetimi:** `openXStream` bir `WebSocket` döner; `closeWs(ws)` CONNECTING ise `open`'da
kapatır (StrictMode çift-mount + hızlı sembol değişiminde "closed before established" uyarısını önler).
**RAF throttle (OrderBook):** her WS mesajı `latest`'i günceller; `requestAnimationFrame` ile
ekrana en fazla kare hızında basılır (10Hz akışta gereksiz re-render yok).

---

## 3) FİYAT ALARMI — uçtan uca (en kritik)

### 3.1 Ingestion (besleme) — uygulama açılışında
```
[Thread: main → ② WS IO]
ApplicationReadyEvent
  ► BinanceWebSocketClient.start() ► connect()
      ► container.connectToServer(ExchangeEndpoint, wss://stream.binance.com:443/ws)
  ► ExchangeEndpoint.onOpen(session)            [Thread: ② WS IO]
      ► session.addMessageHandler(String, this::onMessage)
      ► subscribe(session) ► sendSubscribe(session, symbols)   // symbols = ConcurrentHashMap.newKeySet()
          payload: {"method":"SUBSCRIBE","params":["btcusdt@trade","btcusdt@ticker",...],"id":N}
[Thread: ① main] AlarmStoreLoader.loadActiveAlarms()  [ApplicationReadyEvent]
  ► alarmRepository.findByActiveTrue()  ⇒ List<Alarm>
  ► her alarm → alarmStore.add(alarm)
  ► distinct semboller → webSocketClient.ensureSubscribed(sym)   // config dışı semboller de
```

### 3.2 Her tick — SICAK YOL  [Thread: ② WS IO]
```
ExchangeEndpoint onMessage(json)
  ► BinancePriceParser.parse(json)  ⇒ Optional<PriceTick>
       "trade"  → PriceTick(symbol, price=p, changePercent=null)
       "24hrTicker" → PriceTick(symbol, price=c, changePercent=P)
  ► her PriceTickHandler.handle(tick):     // liste: [RuleEngine, PriceCache, MetricsTracker]
     ┌─ RuleEngine.handle(tick)
     │     ► AlarmStore.getBySymbol(tick.symbol())  ⇒ List<Alarm>   // O(1) ConcurrentHashMap
     │     ► boşsa return
     │     ► her alarm:
     │         alarm.isTriggeredBy(price, changePercent)?
     │             PRICE:  ABOVE → price>=target | BELOW → price<=target
     │             PERCENT: ABOVE → cp>=esik | BELOW → cp<=-esik (cp null ise false → @trade atlar)
     │         evetse ► alarm.tryClaimTrigger()  // AtomicBoolean.compareAndSet(false,true)
     │             true (ilk kazanan):
     │                ► AlarmStore.remove(alarm)        // CopyOnWriteArrayList → iterasyonda güvenli
     │                ► triggerHandler.onTriggered(alarm, price)   // = NotificationService → ③'e atlar
     ├─ PriceCache.handle(tick)  → map[symbol]=PriceQuote  (son fiyat snapshot)
     └─ MetricsTracker.handle(tick) → totalTicks.incrementAndGet()
```

### 3.3 Tetikleme sonrası — async hand-off  [Thread: ③ notificationExecutor]
```
NotificationService.onTriggered(alarm, triggerPrice)   [@Async("notificationExecutor") @Transactional]
  ► notifyExternal(...)  → log (ileride Telegram/mail buraya)
  ► alarmRepository.deactivate(alarm.getId(), now)   // is_active=false, triggered_at=now
  ► AlarmEventPublisher.publishTriggered(userId, AlarmTriggeredEvent.of(alarm, triggerPrice))
        emittersByUser : Map<Long, CopyOnWriteArrayList<SseEmitter>>
        ► emittersByUser.get(userId) → her emitter.send(event().name("alarm-triggered").data(event))
        ► IOException/IllegalState (istemci gitmiş) → emitter.complete() → onCompletion listeden siler
  ► meterRegistry.counter("alarm.triggered").increment()
```
> ② motoru burada **beklemez** — eşleşmeyi bulup `onTriggered`'ı ③ havuzuna fırlatır, sonraki tick'e geçer.

### 3.4 Tarayıcıya ulaşma (SSE)  [Thread: ⑥ tarayıcı]
```
useAlarmStream  → new EventSource("/api/alarms/stream?access_token=<JWT>")
   // EventSource header gönderemez → token query param (SecurityConfig bearerTokenResolver buna izinli)
  addEventListener("alarm-triggered", e):
     a = JSON.parse(e.data)  // {symbol, targetPrice, direction, triggerPrice, triggeredAt}
     ► toast.success("🔔 ALARM TETİKLENDİ")
     ► showSystemNotification(...)        // lib/webpush.ts → service worker.showNotification (OS bildirimi)
     ► pushNotification(...)              // bildirim zili store (useNotifications)
     ► queryClient.invalidateQueries(['alarms'])  // liste yeniden çekilir; tetiklenen düşer
```

**Backend tarafı (controller):**  [Thread: ① Tomcat — sonra async tutulur]
```
AlarmController.stream(jwt)  [GET /api/alarms/stream, produces text/event-stream]
  ► AlarmEventPublisher.subscribe(userId)
       emitter = new SseEmitter(30dk)
       emittersByUser[userId].add(emitter)
       onCompletion/onError → removeEmitter ; onTimeout → emitter.complete()+remove (WARN basmaz)
  ⇒ SseEmitter
```

---

## 4) PAPER — MARKET emir (anında)  [Thread: ① Tomcat]

```
[⑥] OrderForm.onSubmit ► usePlaceOrder.mutate({symbol,side:"BUY",type:"MARKET",qty})
  ► POST /api/paper/orders
[①] PaperController.place(req, jwt) ► PaperTradeService.place(req, userId)  [@Transactional]
      symbol="BTCUSDT" → asset="BTC" (son 4 harf USDT kontrolü, değilse PaperTradeException)
      type==MARKET:
        ► BinancePriceClient.currentPrice("BTCUSDT")   // SUNUCUDA REST /ticker/price; istemciye güvenME
             ⇒ 107432.10
        ► applyFill(userId, "BTC", BUY, qty, 107432.10):
             notional = qty*price
             BUY:  bakiye<notional → PaperTradeException("Yetersiz bakiye")
                   account.usdtBalance -= notional
                   pozisyon yok → positionRepo.save(new PaperPosition(qty, price))
                   pozisyon var → newAvg = (eskiQty*eskiAvg + notional)/newQty  [HALF_UP, scale 8]
             SELL: pozisyon yok/yetersiz → PaperTradeException
                   account.usdtBalance += notional ; qty düş (0 ise pozisyonu sil)
        ► order.status=FILLED, price=fillPrice=107432.10, filledAt=now
      ► meterRegistry.counter("paper.order.placed","type","MARKET","side","BUY").increment()
      ► orderRepo.save(order)  ⇒ PaperOrder
[⑥] ◄ onSuccess → queryClient.invalidateQueries(['paper'])  // portföy/emirler tazelenir
     usePortfolio & usePaperOrders [refetchInterval 4000] zaten poll'luyor
```

---

## 5) PAPER — LIMIT emir + SUNUCU-TARAFI matcher

### 5.1 Emir verme (açık bekler)  [Thread: ① Tomcat]
```
PaperTradeService.place(LIMIT):
   price yok/≤0 → PaperTradeException
   order.status=OPEN, price=hedef   // bakiyeye DOKUNMAZ
   counter("paper.order.placed","type","LIMIT",...)++ ; save
```

### 5.2 Eşleştirici (ayrı zamanlı iş — otorite sunucuda)  [Thread: ④ scheduling]
```
PaperOrderMatcher.matchOpenLimitOrders()   @Scheduled(fixedDelayString="${paper.matcher.interval-ms:3000}")
  ► orderRepo.findByStatusAndType(OPEN, LIMIT)  ⇒ List<PaperOrder>  (boşsa return)
  ► distinct semboller → her biri için BinancePriceClient.currentPrice(sym)
        Map<symbol, price>  (sembol başına TEK REST çağrısı; hata → o sembol atlanır, log.debug)
  ► her order:
        price = map[order.symbol]  (null → atla)
        ► PaperTradeService.matchAndFill(order.id, price)   [@Transactional]
             tekrar yükle; OPEN/LIMIT/price var değilse return
             crossed? BUY: price<=limit | SELL: price>=limit   (değilse return)
             try  applyFill(...) → FILLED, fillPrice=limit, filledAt
             catch PaperTradeException → status=CANCELLED   // yetersiz bakiye/pozisyon: sonsuz deneme önlenir
        ► exception → log.warn, sıradakine devam
```
> Sekme/bilgisayar kapalı olsa bile dolum olur — **dolum kararı artık istemcide değil.**

---

## 6) PAPER — Stop-Limit / OCO (client tetik → server dolum)  [Thread: ⑥ tarayıcı → ① backend]

```
OrderForm (Stop-Limit/OCO) ► addConditional({symbol,side,kind,qty,stopPrice,limitPrice,tpPrice?})
   → useConditionalOrders store (modül-seviyesi + localStorage, listeners Set)
useConditionalWatcher()  [useQuery fetchPrices, refetchInterval 3000]
  ► her conditional için triggered(o, price):
       STOP_LIMIT: BUY price>=stop | SELL price<=stop  → {limit: limitPrice}
       OCO: TP (SELL price>=tp | BUY price<=tp) → {limit: tpPrice}
            yoksa STOP (SELL price<=stop | BUY price>=stop) → {limit: limitPrice}
  ► firedRef ile çift-tetik engeli
  ► usePlaceOrder.mutate({type:"LIMIT", price: t.limit, ...})  → #5 sunucu matcher (④) devralır
  ► toast + removeConditional(id)   (hata → fired geri al, tekrar dene)
```
"Koşullu" sekmesi (`BottomTabs`) bu store'u gösterir + tek tek iptal.

---

## 7) PORTFÖY & PnL  [Thread: ⑥ tarayıcı; veri ① backend + Binance]

```
usePortfolio   GET /api/paper/portfolio  ⇒ {usdtBalance, positions:[{asset,qty,avgPrice}]}
usePortfolioValue:
   symbols = positions.map(p => p.asset+"USDT")
   ► fetchPrices(symbols)  [refetchInterval 3000]   ⇒ canlı fiyatlar (Binance, doğrudan)
   her pozisyon zenginleştir:
       value = currentPrice*qty
       pnl   = value - avgPrice*qty          (gerçekleşmemiş)
       pnlPct= pnl/(avgPrice*qty)*100
   equity = usdtBalance + Σ value ; totalPnl = Σ pnl
   ⇒ BalancePanel, PortfolioPage, BottomTabs(Pozisyonlar, footer toplam)

useTradeAnalytics (Analiz sekmesi):
   FILLED emirleri zamana göre sırala → varlık bazında "kitap" {qty, avg}
       BUY  → avg güncelle (ortalama-maliyet)
       SELL → realized = (fillPrice - avg)*qty   → trades[]
   metrikler: realizedPnl, winRate=wins/total, best/worst, daily[] (son 14 gün)
   ⇒ recharts AreaChart (equity) + BarChart (günlük PnL)
```

---

## 8) CANLI FİYAT YAYINI (PriceCache → SSE)

```
[Thread: ② WS IO] PriceCache.handle(tick) → ConcurrentHashMap[symbol]=PriceQuote
[Thread: ④ scheduling] PricePublisher.broadcast()  @Scheduled(fixedRate=1000)   // throttle: saniyede 1
   emitters boşsa return
   snapshot = priceCache.snapshot()
   her emitter.send(event().name("prices").data(snapshot))   // hata → complete()
[Thread: ① Tomcat] PricePublisher.subscribe(): yeni abone HEMEN mevcut snapshot'ı alır (UI anında dolsun)
```
> Tick saniyede onlarca (②); yayın **saniyede 1** (④) → frontend boğulmaz. Fiyatlar ortak (kullanıcıya özel değil).

---

## 9) METRİKLER (Micrometer → Prometheus)

```
MetricsConfig.engineMetrics(MeterBinder):
   Gauge alarm.engine.ticks_per_second ← MetricsTracker.getTicksPerSecond()
        ([④] MetricsTracker.sample() @Scheduled(1000): ticksPerSecond = total - lastSampleTotal)
   Gauge alarm.engine.ticks_total      ← getTotalTicks()
   Gauge alarm.active                  ← AlarmStore.activeCount()
   Gauge exchange.ws.connected         ← BinanceWebSocketClient.isConnected() ? 1 : 0
Counter alarm.triggered          ← [③] NotificationService.onTriggered
Counter paper.order.placed{type,side} ← [①] PaperTradeService.place
GET /actuator/prometheus  → metin formatı → Prometheus scrape → Grafana
```

---

## 10) ŞEMA (Flyway) + başlangıç sırası  [Thread: ① main boot]

```
Spring Boot başlatma sırası:
  1. DataSource hazır
  2. Flyway autoconfigure → db/migration/V1__init.sql
        boş DB:      V1 çalışır (5 tablo + index oluşur)
        dolu DB:     baseline-on-migrate → V1 atlanır, flyway_schema_history baseline'lanır
  3. Hibernate EntityManagerFactory → ddl-auto: validate
        entity ↔ tablo kolon/tip uyumunu kontrol eder; uyumsuzsa BAŞLAMAZ (drift erken yakalanır)
  4. ApplicationReadyEvent → WS bağlan (② başlar) + alarm store yükle
```

---

## 11) TEST AKIŞI

```
./gradlew test
  Unit (MockitoExtension):
     PaperTradeServiceTest: @Mock repolar + @Spy SimpleMeterRegistry, @InjectMocks service
        → "2 BTC @100 al → bakiye -200, avg=100" gibi assertion'lar (DB yok, ms'ler)
     RuleEngineTest: alarm eşleşme + tek-kez tetik
  Integration (@SpringBootTest @Testcontainers(disabledWithoutDocker=true)):
     AbstractIntegrationTest: @Container PostgreSQLContainer + @ServiceConnection (datasource auto)
     CryptoalarmApplicationTests.contextLoads: gerçek DB + Flyway + tüm context boot
     AuthControllerIT (@AutoConfigureMockMvc): register→201+token, login→200+token, /api/alarms→401
  Docker yoksa IT'ler ATLANIR; CI (.github/workflows/ci.yml) ubuntu'da Docker'lı koşar.
```

---

## 12) Eşzamanlılık (concurrency) haritası — thread'ler ayrı ayrı

| Bölge | Thread | Veri yapısı | Neden |
|-------|--------|-------------|-------|
| Tick eşleştirme | ② WS IO | `ConcurrentHashMap<String, CopyOnWriteArrayList<Alarm>>` | Lock-free okuma; yayınla mutasyon güvenli |
| Tek-kez tetik | ② WS IO | `AtomicBoolean` (alarm başına) | `compareAndSet` ile yarış koşulsuz |
| Bildirim/DB/SSE push | ③ notificationExecutor | — | Motoru (②) yavaşlatmamak |
| SSE abone listesi | ① Tomcat + ③ | `Map<Long, CopyOnWriteArrayList<SseEmitter>>` | Farklı thread'lerden ekle/yayınla güvenli |
| Limit matcher | ④ scheduling | DB sorgusu + @Transactional | Sunucu otoritesi, periyodik 3sn |
| Fiyat yayını | ④ scheduling | `ConcurrentHashMap` snapshot | Throttle 1sn |
| WS sembol seti | main + ② + ① | `ConcurrentHashMap.newKeySet()` | Dinamik abonelik thread-safe |
| Reconnect zamanlama | ⑤ ws-reconnect | tek daemon executor | Üstel geri çekilme |
| HTTP istekleri | ① Tomcat nio-exec-* | thread-per-request | Standart servlet modeli |

**Thread'ler arası geçiş noktaları (kritik):**
- ② → ③ : `triggerHandler.onTriggered` `@Async` olduğu için çağrı anında ③ havuzuna devreder (②'yi bloklamaz).
- ② → ④ : doğrudan yok; ④ kendi tetiklenir (matcher/publisher) ama ②'nin yazdığı `PriceCache`/`AlarmStore`'u okur.
- ① → SSE: istek async'e geçer, Tomcat thread'i serbest kalır; emitter ③/④'ten beslenir.

---

## 13) "Hangi tech, nerede, neden" özet

| Teknoloji | Nerede | Neden |
|-----------|--------|-------|
| Spring Security OAuth2 RS + JWT | `SecurityConfig`, `JwtService` | Stateless, ölçeklenir; sunucuda oturum yok |
| BCrypt | `AuthService` | Salt'lı, yavaş hash → brute-force'a dirençli |
| `jakarta.websocket` | `BinanceWebSocketClient` | Kalıcı tek bağlantı + dinamik SUBSCRIBE |
| In-memory store | `InMemoryAlarmStore` | Sıcak yolda DB yok; arayüz sayesinde yarın Redis'e taşınabilir |
| `AtomicBoolean` CAS | `Alarm.tryClaimTrigger` | Tam-bir-kez tetik |
| `@Async` | `NotificationService` | Sıcak yolu bloklamayan yan etki |
| SSE | `AlarmEventPublisher`, `PricePublisher` | Tek yönlü push; WS'ten hafif |
| `@Scheduled` | `PaperOrderMatcher`, `PricePublisher`, `MetricsTracker` | Periyodik: dolum, yayın, örnekleme |
| Spring Data JPA | `repository/` | Boilerplate'siz CRUD + türetilmiş sorgular |
| Flyway | `db/migration` | Versiyonlu, geri-alınabilir şema; drift kontrolü |
| Micrometer/Prometheus | `MetricsConfig` | Üretim gözlemlenebilirliği |
| Testcontainers | `AbstractIntegrationTest` | Gerçek DB'ye karşı, sıfır-kurulum test |
| TanStack Query | `hooks/` | Server-state cache + otomatik refetch |
| EventSource | `useAlarmStream` | Tarayıcıda hazır SSE + auto-reconnect |
| lightweight-charts | `ChartPanel` | Hafif, performanslı TradingView grafiği |
| Vite code-split | `TradingTerminal` lazy | İlk açılış bundle'ı küçük |

---

*github.com/ataberk388-ux/min-tradeof — Java 21 · Spring Boot 3.5 · React 19 · PostgreSQL 16*
