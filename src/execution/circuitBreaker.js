require('dotenv').config();
const { getDailyLoss } = require('../db/trades');
const { query }        = require('../db/connection');

const CAPITAL      = parseFloat(process.env.CAPITAL    || 500000);
const CB_PERCENT   = parseFloat(process.env.CB_PERCENT || 2);
const LIMIT_AMOUNT = CAPITAL * (CB_PERCENT / 100);

let TRADING_ENABLED = true;

/**
 * Check circuit breaker. If daily loss >= limit: halt all trading.
 * @returns {boolean} true = tripped, false = safe
 */
async function checkCircuitBreaker() {
  if (!TRADING_ENABLED) return true;

  const lossAmt = await getDailyLoss();
  const pctUsed = parseFloat(((lossAmt / LIMIT_AMOUNT) * 100).toFixed(2));

  await query(
    `INSERT INTO cb_log (logged_at, loss_amount, limit_amount, pct_used, tripped, action) VALUES (NOW(), ?, ?, ?, ?, ?)`,
    [lossAmt, LIMIT_AMOUNT, pctUsed, false, 'CHECK']
  );

  if (lossAmt >= LIMIT_AMOUNT) {
    TRADING_ENABLED = false;
    await query(
      `INSERT INTO cb_log (logged_at, loss_amount, limit_amount, pct_used, tripped, action) VALUES (NOW(), ?, ?, ?, ?, ?)`,
      [lossAmt, LIMIT_AMOUNT, pctUsed, true, 'TRIPPED — trading halted']
    );
    console.error(`\n🔴 CIRCUIT BREAKER TRIPPED!`);
    console.error(`   Daily loss: ₹${lossAmt.toLocaleString('en-IN')}`);
    console.error(`   Limit (${CB_PERCENT}%): ₹${LIMIT_AMOUNT.toLocaleString('en-IN')}`);
    console.error(`   All trading halted for today.\n`);
    return true;
  }

  console.log(`[CB] Safe — ₹${lossAmt.toLocaleString('en-IN')} / ₹${LIMIT_AMOUNT.toLocaleString('en-IN')} (${pctUsed}%)`);
  return false;
}

function isTradingEnabled() { return TRADING_ENABLED; }
function resetForTesting()  { TRADING_ENABLED = true; }

module.exports = { checkCircuitBreaker, isTradingEnabled, resetForTesting, LIMIT_AMOUNT };
