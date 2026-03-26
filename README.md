# AngelQuant

Algorithmic trading system for Angel One SmartAPI.
**Strategy:** Buy when 5-min RSI < 30 AND price is above 200 EMA on the 15-min chart.

## Features
- Real-time WebSocket scanner for 20 NSE symbols (NIFTY 50 subset)
- Worker threads — non-blocking, evaluates every symbol on every tick
- RSI + EMA strategy with configurable thresholds via `.env`
- Circuit breaker — halts ALL trading if daily loss exceeds 2% of capital
- Paper trade mode — safe offline testing, zero real orders
- Backtest engine against 6 months of historical data
- RSI threshold optimizer (sweeps 25–45, prints win rate table)
- Standalone test runner — **no npm install needed** (`node run_tests.js`)
- MySQL schema: `candles`, `signals`, `trades`, `cb_log`
- Docker Compose for one-command local setup

---

## Quick Start — Offline / Paper Trade (No Angel One account needed)

### 1. Prerequisites
```bash
node --version   # v20+
mysql --version  # v8+
git --version
```

### 2. Clone & install
```bash
git clone https://github.com/wtaanu/angelquant.git
cd angelquant
npm install
```

### 3. Setup database
```bash
# Start MySQL
sudo service mysql start          # Linux / WSL
# brew services start mysql       # macOS

# Create DB + all 4 tables
mysql -u root -p < src/db/schema.sql
```

### 4. Configure environment
```bash
cp .env.example .env
# Only DB settings needed for paper trade mode:
# DB_HOST=localhost  DB_USER=aquser  DB_PASS=aqpass123
```

### 5. Run tests (no npm install needed!)
```bash
node run_tests.js        # 61 tests — RSI, EMA, circuit breaker, structure
npm test                 # Jest tests (needs npm install)
```

Expected output:
```
━━━ RSI Calculator ━━━
✓ throws on insufficient data
✓ values always 0-100
✓ RSI < 30 on downtrend
...
  61/61 passed | 0 failed
```

### 6. Seed offline test data
```bash
npm run seed
# Generates 6 months of synthetic candles for 5 symbols
# No Angel One account needed
```

### 7. Run backtest
```bash
npm run backtest                              # RSI=30, EMA=200 (defaults)
node scripts/backtest.js --rsi 35 --ema 200  # custom threshold
node scripts/optimizeRSI.js                  # sweep RSI 25-45
```

### 8. Start paper trading
```bash
# Make sure PAPER_TRADE=true in .env (it is by default)
npm start
```

---

## Live Trading Setup

1. Create account at [Angel One SmartAPI](https://smartapi.angelbroking.com)
2. Get API key, client ID, MPIN, TOTP secret
3. Fill in `.env`:
```
ANGEL_API_KEY=your_key
ANGEL_CLIENT_ID=your_id
ANGEL_PASSWORD=your_mpin
ANGEL_TOTP_SECRET=your_totp
PAPER_TRADE=false
```
4. Download real historical data:
```bash
node scripts/downloadHistory.js --all
```
5. Start live:
```bash
npm start
```

---

## Docker (one command)
```bash
cp .env.example .env
docker compose up -d
# MySQL + app both start, schema auto-applied
```

---

## Project Structure
```
angelquant/
├── src/
│   ├── strategy/
│   │   ├── rsi.js               Wilder RSI calculator
│   │   ├── ema.js               EMA calculator
│   │   └── evaluateStrategy.js  Core: RSI<30 AND price>EMA200
│   ├── scanner/
│   │   ├── websocket.js         Angel One Smart Stream client
│   │   ├── worker.js            Worker thread per symbol
│   │   └── watchlist.js         20 NSE symbols + Angel One tokens
│   ├── db/
│   │   ├── connection.js        MySQL pool
│   │   ├── candles.js           Candle read/write
│   │   ├── trades.js            Trade/signal CRUD
│   │   └── schema.sql           Full 4-table schema
│   └── execution/
│       ├── placeOrder.js        Angel One REST order + paper mode
│       ├── circuitBreaker.js    2% daily loss halt
│       └── auth.js              JWT token + auto-refresh
├── tests/                       Jest test files
├── scripts/
│   ├── seedTestData.js          Offline synthetic candle generator
│   ├── backtest.js              Historical backtester
│   ├── downloadHistory.js       Angel One history downloader
│   └── optimizeRSI.js           RSI threshold sweeper
├── run_tests.js                 Standalone test runner (no jest needed)
├── index.js                     Main entry point
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## npm Scripts
| Command | What it does |
|---|---|
| `npm start` | Start scanner (paper or live) |
| `npm run dev` | Start with nodemon auto-reload |
| `npm test` | Run Jest tests |
| `npm run test:coverage` | Tests + coverage report |
| `npm run seed` | Generate offline test data |
| `npm run backtest` | Backtest with default settings |
| `node run_tests.js` | Run all tests without npm install |

---

## Circuit Breaker
Set `CB_PERCENT=2` in `.env` — system halts if daily P&L loss exceeds 2% of capital.
Default: 2% of ₹5,00,000 = ₹10,000 limit.
Every check is logged to the `cb_log` MySQL table.

---

## Disclaimer
This software is for educational purposes only. Algorithmic trading carries significant financial risk. Always test thoroughly in paper trade mode before going live. The authors are not responsible for any financial losses.
