/**
 * Exponential Moving Average
 * @param {number[]} closes  Array of close prices, oldest first
 * @param {number}   period  e.g. 200
 * @returns {number[]}       EMA values
 */
function calculateEMA(closes, period = 200) {
  if (closes.length < period) {
    throw new Error(`EMA(${period}) needs at least ${period} candles, got ${closes.length}`);
  }
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const emaArr = [ema];
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    emaArr.push(ema);
  }
  return emaArr;
}

function getLatestEMA(closes, period = 200) {
  return calculateEMA(closes, period).at(-1);
}

module.exports = { calculateEMA, getLatestEMA };
