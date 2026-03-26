require('dotenv').config();
const axios = require('axios');
const { checkCircuitBreaker } = require('./circuitBreaker');
const { insertSignal, insertTrade, getOpenTrades } = require('../db/trades');

const PAPER_TRADE   = process.env.PAPER_TRADE !== 'false';
const MAX_POSITIONS = parseInt(process.env.MAX_POSITIONS || 5);
const QTY_PER_TRADE = 1;
let authToken = null;

function setAuthToken(token) { authToken = token; }

async function placeOrder({ symbol, price, rsi, ema }) {
  const tripped = await checkCircuitBreaker();
  if (tripped) { console.warn(`[ORDER] Blocked by CB — ${symbol}`); return null; }

  const open = await getOpenTrades();
  if (open.length >= MAX_POSITIONS) {
    console.warn(`[ORDER] Max positions reached — skipping ${symbol}`);
    return null;
  }

  const signal_id = await insertSignal({ symbol, rsi_val: rsi, ema_val: ema, price });

  if (PAPER_TRADE) {
    const trade_id = await insertTrade({
      signal_id, symbol, order_id: `PAPER-${Date.now()}`,
      entry_price: price, qty: QTY_PER_TRADE, paper_trade: true,
    });
    console.log(`[PAPER] BUY ${symbol} @ ₹${price} | qty=${QTY_PER_TRADE} | trade_id=${trade_id}`);
    return { order_id: `PAPER-${Date.now()}`, trade_id };
  }

  if (!authToken) throw new Error('authToken not set — call setAuthToken() first');

  try {
    const { data } = await axios.post(
      'https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/placeOrder',
      { variety:'NORMAL', tradingsymbol:symbol, transactiontype:'BUY',
        exchange:'NSE', ordertype:'MARKET', producttype:'INTRADAY',
        duration:'DAY', quantity:String(QTY_PER_TRADE), price:'0', triggerprice:'0' },
      { headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-PrivateKey': process.env.ANGEL_API_KEY,
        }
      }
    );
    if (!data.status) throw new Error(data.message || 'Order failed');
    const order_id = data.data.orderid;
    const trade_id = await insertTrade({ signal_id, symbol, order_id, entry_price: price, qty: QTY_PER_TRADE, paper_trade: false });
    console.log(`[ORDER] LIVE BUY ${symbol} @ ₹${price} | order_id=${order_id}`);
    return { order_id, trade_id };
  } catch (err) {
    console.error(`[ORDER] Error for ${symbol}:`, err.response?.data || err.message);
    if (err.response?.data?.errorcode === 'AG4001') console.warn('[ORDER] Token expired — re-authenticate');
    return null;
  }
}

module.exports = { placeOrder, setAuthToken };
