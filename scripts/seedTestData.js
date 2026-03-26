/**
 * seedTestData.js — generates synthetic candles for offline testing
 * No Angel One account needed.
 * Usage: node scripts/seedTestData.js
 */
require('dotenv').config();
const { getPool } = require('../src/db/connection');

const SYMBOLS     = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK'];
const SEED_PRICES = { RELIANCE:2800, TCS:3700, INFY:1600, HDFCBANK:1700, ICICIBANK:1150 };

function generateCandles(symbol, timeframe, count, basePrice, startDate) {
  const rows = [];
  let price = basePrice;
  let t = new Date(startDate);
  const stepMs = timeframe === '5m' ? 5*60000 : 15*60000;
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.49) * price * 0.004;
    price  = Math.max(price, 10);
    const open  = +price.toFixed(2);
    const high  = +(price*(1+Math.random()*0.003)).toFixed(2);
    const low   = +(price*(1-Math.random()*0.003)).toFixed(2);
    const close = +(low + Math.random()*(high-low)).toFixed(2);
    const vol   = Math.floor(Math.random()*500000)+50000;
    rows.push([symbol, timeframe, t.toISOString().slice(0,19).replace('T',' '), open, high, low, close, vol]);
    t = new Date(t.getTime() + stepMs);
  }
  return rows;
}

async function seed() {
  const pool = getPool();
  const start = new Date(Date.now() - 180*24*60*60*1000);
  console.log('Seeding test data...\n');
  const sql = `INSERT IGNORE INTO candles (symbol,timeframe,open_time,open,high,low,close,volume) VALUES ?`;
  for (const sym of SYMBOLS) {
    const base = SEED_PRICES[sym];
    const [r5]  = await pool.query(sql, [generateCandles(sym,'5m', 14400,base,start)]);
    const [r15] = await pool.query(sql, [generateCandles(sym,'15m',4860, base,start)]);
    console.log(`  ✓ ${sym}: ${r5.affectedRows} 5m + ${r15.affectedRows} 15m candles`);
  }
  console.log('\n✅ Done! Run: node scripts/backtest.js\n');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
