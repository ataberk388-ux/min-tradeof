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

- **📊 Real-time spot terminal** — TradingView candlestick chart (with volume + indicators), live order book with depth grouping & spread, recent trades feed, and a searchable markets sidebar with favorites.
- **💰 Paper trading** — virtual USDT balance, market & limit orders, positions with **live unrealized PnL** and total equity. Market orders fill at the real Binance price (fetched server-side).
- **🔔 Price alarm engine** — set price targets; a concurrent rule engine matches live ticks `O(1)` per symbol with an atomic CAS guard for **exactly-once** triggering, then pushes the hit to the UI over **Server-Sent Events**.
- **🔐 Multi-user auth** — stateless **JWT** (Spring Security OAuth2 Resource Server), BCrypt passwords, per-user data isolation.
- **⚡ Lean by design** — direct Binance public API/WS for market data keeps the backend focused on what's truly ours: auth, alarms, and the paper portfolio.

## 📸 Screenshots

| Desktop terminal | Mobile |
| :--------------: | :----: |
| ![Terminal](docs/terminal.png) | ![Mobile](docs/mobile.png) |

## 🧱 Tech Stack

**Backend**
- Java 21 · Spring Boot 3.5
- Spring Security (OAuth2 Resource Server / JWT) · BCrypt
- Spring Data JPA · PostgreSQL
- `jakarta.websocket` (Binance ingestion) · `@Async` thread pool · `@Scheduled`
- Server-Sent Events (live trigger & price push) · Actuator

**Frontend**
- React 19 · TypeScript · Vite
- TanStack Query (server state) · Zod + react-hook-form (validation)
- Tailwind CSS · Radix UI (tabs, dropdown, dialog)
- **lightweight-charts** (TradingView) · **dnd-kit** (drag-sort) · Recharts
- axios · Sonner (toasts)

**Market data**
- Binance public REST + WebSocket streams (`@kline`, `@depth`, `@trade`, `@ticker`) — no API key required.

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

| Service     | URL                                   |
| ----------- | ------------------------------------- |
| Frontend    | http://localhost:5173                 |
| REST API    | http://localhost:8080/api             |
| Health      | http://localhost:8080/actuator/health |
| PostgreSQL  | localhost:5432 (`cryptoalarm`)        |

> The JWT secret is read from the `JWT_SECRET` env var (a dev default is provided).

## 📁 Project Structure

```
.
├── src/main/java/com/.../cryptoalarm
│   ├── api/            # REST controllers (auth, alarms, paper, stats, prices)
│   ├── domain/         # JPA entities (Alarm, User, PaperAccount/Position/Order)
│   ├── engine/         # Rule engine (the hot path)
│   ├── ingestion/      # Binance WebSocket client + parser + price cache
│   ├── notification/   # SSE publishers (triggers, prices)
│   ├── security/       # JWT issuing
│   └── service/        # Alarm + paper-trading services
└── frontend/src
    ├── components/trade/  # Terminal: chart, order book, trades, order form…
    ├── hooks/             # data hooks (Binance, paper, auth)
    └── lib/               # Binance API, formatting, axios
```

## 📜 License

[MIT](LICENSE)
