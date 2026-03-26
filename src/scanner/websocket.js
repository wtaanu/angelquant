require('dotenv').config();
const WebSocket     = require('ws');
const { Worker }    = require('worker_threads');
const path          = require('path');
const { WATCHLIST } = require('./watchlist');
const { placeOrder } = require('../execution/placeOrder');

const WORKER_PATH = path.resolve(__dirname, 'worker.js');
const livePrices  = {};
let isConnected   = false;

function buildSubscribePayload() {
  return JSON.stringify({
    correlationID: 'scanner_1',
    action: 1,
    params: {
      mode: 2,
      tokenList: [{ exchangeType: 1, tokens: WATCHLIST.map(w => w.token) }],
    },
  });
}

function startWebSocket(jwtToken) {
  const ws = new WebSocket('wss://smartapisocket.angelone.in/smart-stream', {
    headers: {
      Authorization:   `Bearer ${jwtToken}`,
      'x-api-key':     process.env.ANGEL_API_KEY,
      'x-client-code': process.env.ANGEL_CLIENT_ID,
      'x-feed-token':  jwtToken,
    },
  });

  ws.on('open', () => {
    isConnected = true;
    console.log('[WS] Connected to Angel One Smart Stream');
    ws.send(buildSubscribePayload());
    console.log(`[WS] Subscribed to ${WATCHLIST.length} symbols`);
  });

  ws.on('message', async (raw) => {
    try {
      const tick   = JSON.parse(raw);
      if (!tick.token) return;
      const entry  = WATCHLIST.find(w => w.token === String(tick.token));
      if (!entry) return;
      const symbol = entry.symbol;
      const price  = tick.ltp / 100;
      livePrices[symbol] = price;

      // Worker thread per symbol — non-blocking
      const worker = new Worker(WORKER_PATH, { workerData: { symbol, currentPrice: price } });
      worker.on('message', async ({ success, data }) => {
        if (!success || !data.isBuySignal) return;
        console.log(`[SIGNAL] BUY ${data.symbol} | RSI=${data.rsi} | Price=${data.price} | EMA=${data.ema}`);
        await placeOrder({ symbol: data.symbol, price: data.price, rsi: data.rsi, ema: data.ema });
      });
      worker.on('error', err => console.error(`[WORKER] ${symbol}:`, err.message));
    } catch (err) {
      console.error('[WS] Parse error:', err.message);
    }
  });

  ws.on('close', () => {
    isConnected = false;
    console.warn('[WS] Disconnected. Reconnecting in 5s...');
    setTimeout(() => startWebSocket(jwtToken), 5000);
  });

  ws.on('error', err => console.error('[WS] Error:', err.message));
  return ws;
}

module.exports = { startWebSocket, livePrices };
