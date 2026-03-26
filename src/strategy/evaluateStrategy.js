require('dotenv').config();
const { getRecentCloses } = require('../db/candles');
const { getLatestRSI }    = require('./rsi');
const { getLatestEMA }    = require('./ema');

const RSI_PERIOD    = 14;
const EMA_PERIOD    = parseInt(process.env.EMA_PERIOD    || 200);
const RSI_THRESHOLD = parseFloat(process.env.RSI_THRESHOLD || 30);

/**
 * Core strategy: Buy when 5-min RSI < threshold AND price > 15-min EMA(200)
 * @param {string} symbol        e.g. 'RELIANCE'
 * @param {number} [currentPrice] Live tick price (optional)
 * @returns {{ symbol, rsi, ema, price, isBuySignal }}
 */
async function evaluateStrategy(symbol, currentPrice = null) {
  const closes5m  = await getRecentCloses(symbol, '5m',  RSI_PERIOD + 10);
  if (closes5m.length < RSI_PERIOD + 1) {
    return { symbol, error: 'Insufficient 5m data', isBuySignal: false };
  }
  const closes15m = await getRecentCloses(symbol, '15m', EMA_PERIOD + 20);
  if (closes15m.length < EMA_PERIOD) {
    return { symbol, error: 'Insufficient 15m data', isBuySignal: false };
  }
  const rsi   = getLatestRSI(closes5m,  RSI_PERIOD);
  const ema   = getLatestEMA(closes15m, EMA_PERIOD);
  const price = currentPrice ?? closes5m.at(-1);
  const isBuySignal = rsi < RSI_THRESHOLD && price > ema;
  return {
    symbol,
    rsi:   parseFloat(rsi.toFixed(2)),
    ema:   parseFloat(ema.toFixed(2)),
    price: parseFloat(price.toFixed(2)),
    isBuySignal,
  };
}

module.exports = { evaluateStrategy };
