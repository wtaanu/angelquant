/**
 * Wilder's RSI — same as TradingView / Angel One charts
 * @param {number[]} closes  Array of close prices, oldest first
 * @param {number}   period  Default 14
 * @returns {number[]}       Array of RSI values
 */
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) {
    throw new Error(`RSI needs at least ${period + 1} candles, got ${closes.length}`);
  }
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss += Math.abs(delta);
  }
  avgGain /= period;
  avgLoss /= period;
  const rsiArr = [100 - 100 / (1 + avgGain / (avgLoss || 0.0001))];
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain  = delta > 0 ? delta : 0;
    const loss  = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsiArr.push(100 - 100 / (1 + avgGain / (avgLoss || 0.0001)));
  }
  return rsiArr;
}

function getLatestRSI(closes, period = 14) {
  return calculateRSI(closes, period).at(-1);
}

module.exports = { calculateRSI, getLatestRSI };
