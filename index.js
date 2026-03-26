/**
 * AngelQuant — Main Entry Point
 * PAPER_TRADE=true  node index.js   ← safe, no real orders
 * PAPER_TRADE=false node index.js   ← LIVE trading
 */
require('dotenv').config();
const { testConnection } = require('./src/db/connection');
const { startWebSocket } = require('./src/scanner/websocket');
const { setAuthToken }   = require('./src/execution/placeOrder');
const { getAuthToken }   = require('./src/execution/auth');

const PAPER_TRADE = process.env.PAPER_TRADE !== 'false';

async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('  AngelQuant Trading System v1.0');
  console.log(`  Mode: ${PAPER_TRADE ? '📋 PAPER TRADE (safe)' : '🔴 LIVE TRADING'}`);
  console.log('═══════════════════════════════════════\n');

  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('❌ Cannot connect to MySQL. Is it running?');
    console.error('   Fix: sudo service mysql start');
    console.error('   Then: mysql -u root -p < src/db/schema.sql\n');
    process.exit(1);
  }

  let jwtToken = 'PAPER_TOKEN';
  if (!PAPER_TRADE) {
    try {
      jwtToken = await getAuthToken();
    } catch (err) {
      console.error('❌ Angel One auth failed:', err.message);
      process.exit(1);
    }
    setAuthToken(jwtToken);
  } else {
    console.log('[AUTH] Paper trade mode — skipping Angel One auth\n');
  }

  if (PAPER_TRADE) {
    console.log('[SCAN] Paper mode: offline scanner every 10s...\n');
    const { evaluateStrategy } = require('./src/strategy/evaluateStrategy');
    const { placeOrder }       = require('./src/execution/placeOrder');
    const { WATCHLIST }        = require('./src/scanner/watchlist');

    const scan = async () => {
      for (const { symbol } of WATCHLIST.slice(0, 5)) {
        const result = await evaluateStrategy(symbol).catch(() => null);
        if (!result) continue;
        const icon = result.isBuySignal ? '🟢' : '⚪';
        console.log(`${icon} ${symbol.padEnd(12)} RSI=${String(result.rsi??'N/A').padEnd(6)} EMA=${result.ema??'N/A'} ${result.isBuySignal?'→ BUY SIGNAL':''}`);
        if (result.isBuySignal) await placeOrder(result);
      }
      console.log('-'.repeat(60));
    };
    await scan();
    setInterval(scan, 10000);
  } else {
    startWebSocket(jwtToken);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
