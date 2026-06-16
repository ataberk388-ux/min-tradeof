<div align="center">

# 📈 Crypto Spot Trading Terminal

**A real-time, Binance-style crypto spot trading terminal with paper trading and a concurrent price-alarm engine.**

Live market data straight from Binance · virtual portfolio · multi-user · JWT auth.

![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

---

## ✨ Overview

A full-stack trading terminal that streams **live market data directly from Binance** (charts, order book, recent trades, markets) and lets you **trade on paper** with a virtual portfolio — no real funds, no risk. Under the hood, a **thread-safe, high-throughput alarm engine** matches incoming price ticks against your alarms in real time and pushes triggers to the browser over SSE.

## 🚀 Features

- **📊 Real-time spot terminal** — TradingView candlestick chart (volume + MA/EMA/Bollinger/RSI/MACD), a **live order book** with depth grouping, cumulative-depth bars, your-orders markers, hover avg/total/cost tooltip and a last-price ticker, recent-trades feed, and a searchable markets sidebar with favorites.
- **💰 Paper trading** — virtual USDT balance; **Market, Limit, Stop-Limit & OCO** orders; positions with **live unrealized PnL** and total equity. Market orders fill at the real Binance price (server-side), and **open Limit orders are matched & filled by a server-side scheduler** — authoritative, even when the app is closed.
- **🔔 Price alarm engine** — **price** and **24h percent-change** alarms; a concurrent rule engine matches live ticks `O(1)` per symbol with an atomic CAS guard for **exactly-once** triggering, then pushes the hit to the UI over **SSE** and as an **OS/browser notification**. The feed **auto-subscribes** to any symbol you set an alarm on.
- **🧭 Multi-page app** — Trade · Markets · Portfolio (with an **analytics tab**: equity curve, realized PnL, win-rate, daily PnL) · Alarms · Profile, plus a **⌘K command palette**, **Convert** (quick swap), **coin info** drawer (CoinGecko), accent theming, and PWA install.
- **🔐 Multi-user auth** — stateless **JWT** (Spring Security OAuth2 Resource Server), BCrypt passwords, password change, per-user data isolation.
- **🛠️ Production-minded backend** — **Flyway** migrations, **Testcontainers** integration tests, and **Micrometer/Prometheus** metrics.

## 📸 Screenshots

| Desktop terminal | Mobile |
| :--------------: | :----: |
| ![Terminal](docs/terminal.png) | ![Mobile](docs/mobile.png) |

## 🧱 Tech Stack

**Backend**
- Java 21 · Spring Boot 3.5
- Spring Security (OAuth2 Resource Server / JWT) · BCrypt
- Spring Data JPA · PostgreSQL · **Flyway** (versioned migrations, `ddl-auto: validate`)
- `jakarta.websocket` (Binance ingestion, dynamic subscription) · `@Async` thread pool · `@Scheduled` (order matcher, metrics)
- Server-Sent Events (live trigger & price push) · Actuator · **Micrometer + Prometheus**
- **Testcontainers** + JUnit 5 (real-Postgres integration tests)

**Frontend**
- React 19 · TypeScript · Vite 8 (route-level **code-splitting**) · PWA (`vite-plugin-pwa`)
- TanStack Query (server state) · Zod + react-hook-form (validation)
- Tailwind CSS · Radix UI (tabs, dropdown, dialog)
- **lightweight-charts** (TradingView) · **dnd-kit** (drag-sort) · Recharts
- axios · Sonner (toasts) · Web Notifications API

**Market data**
- Binance public REST + WebSocket streams (`@kline`, `@depth`, `@trade`, `@ticker`) — no API key required.
- CoinGecko public API for the coin-info drawer (market cap, supply, ATH/ATL).

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph Browser["🖥️ Frontend (React)"]
        UI[Trading Terminal]
    end

    subgraph Backend["⚙️ Backend (Spring Boot)"]
        WS[Binance WS Client]
        ENG[Rule Engine<br/>O(1) match + CAS guard]
        STORE[(In-Memory<br/>Alarm Store)]
        API[REST API<br/>auth · alarms · paper]
        SSE[SSE Publisher]
    end

    DB[(PostgreSQL)]
    BIN[(Binance Public<br/>REST + WS)]

    BIN -- live ticks --> WS --> ENG
    ENG <--> STORE
    ENG -- trigger --> SSE -- push --> UI
    UI -- REST --> API <--> DB
    UI -- market data (direct) --> BIN
```

**Highlights**
- In-memory alarm store: `ConcurrentHashMap` (per-symbol) + `CopyOnWriteArrayList` for lock-free reads on the hot path.
- Rule engine uses `AtomicBoolean.compareAndSet()` (`tryClaimTrigger`) so each alarm fires **exactly once** even under concurrent ticks.
- Triggered alarms and live prices are streamed to the browser over **SSE**; the heavy market data is pulled **directly from Binance** by the client.
- **Server-authoritative fills:** a `@Scheduled` `PaperOrderMatcher` scans open Limit orders against live prices and fills them server-side — independent of whether the browser tab is open.
- **Dynamic ingestion:** the WebSocket client seeds from config but auto-`SUBSCRIBE`s to any new symbol an alarm is created for, so coverage isn't limited to a fixed list.

## ⚙️ Getting Started

**Prerequisites:** JDK 21 · Node 18+ · Docker (for PostgreSQL)

```bash
# 1) Database
docker compose up -d

# 2) Backend → http://localhost:8080
./gradlew bootRun

# 3) Frontend → http://localhost:5173
cd frontend && npm install && npm run dev
```

Open http://localhost:5173, create an account, and start trading on paper.

| Service     | URL                                        |
| ----------- | ------------------------------------------ |
| Frontend    | http://localhost:5173                      |
| REST API    | http://localhost:8080/api                  |
| Health      | http://localhost:8080/actuator/health      |
| Metrics     | http://localhost:8080/actuator/prometheus  |
| PostgreSQL  | localhost:5432 (`cryptoalarm`)             |

> The JWT secret is read from the `JWT_SECRET` env var (a dev default is provided).
> The schema is managed by **Flyway** (`db/migration`); Hibernate runs in `validate` mode.

## 🧪 Testing & Observability

```bash
./gradlew test          # unit tests + Testcontainers integration tests
```

- **Unit tests** (Mockito) cover the paper-trading money logic and the rule engine.
- **Integration tests** spin up a real **PostgreSQL via Testcontainers** (`@ServiceConnection`) — Flyway migrations run and the full Spring context boots against it. They `@Testcontainers(disabledWithoutDocker = true)`, so they **run when Docker is reachable and skip gracefully otherwise**.
- **Metrics** are exposed at `/actuator/prometheus`: engine throughput (`alarm_engine_ticks_per_second`), active alarms, WS connection, and `alarm_triggered` / `paper_order_placed` counters.

> Using Docker via **WSL2/Ubuntu**? Run `./gradlew test` from inside the Ubuntu shell so Testcontainers detects the Docker socket natively.

## 📁 Project Structure

```
.
├── src/main/java/com/.../cryptoalarm
│   ├── api/            # REST controllers (auth, account, alarms, paper, stats, prices)
│   ├── config/         # security, async/scheduling, metrics, exchange props
│   ├── domain/         # JPA entities (Alarm, User, PaperAccount/Position/Order)
│   ├── engine/         # Rule engine (the hot path)
│   ├── ingestion/      # Binance WebSocket client + parser + price cache + metrics
│   ├── notification/   # SSE publishers (triggers, prices)
│   ├── security/       # JWT issuing
│   └── service/        # Alarm, paper-trading & server-side order matcher
├── src/main/resources/db/migration   # Flyway migrations (V1__init.sql)
├── src/test/java/.../cryptoalarm      # unit + Testcontainers integration tests
└── frontend/src
    ├── components/trade/  # Terminal: chart, order book, trades, order form…
    ├── components/pages/  # Markets, Portfolio, Analytics, Alarms, Profile
    ├── hooks/             # data hooks (Binance, paper, auth, route, conditional orders)
    └── lib/               # Binance + CoinGecko APIs, web push, formatting, axios
```

## 📜 License

[MIT](LICENSE)
