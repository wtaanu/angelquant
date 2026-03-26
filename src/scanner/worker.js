/**
 * Worker thread: evaluates strategy for one symbol per tick.
 * Spawned by websocket.js — runs in its own thread so main scanner never lags.
 */
const { workerData, parentPort } = require('worker_threads');
const { evaluateStrategy } = require('../strategy/evaluateStrategy');

(async () => {
  try {
    const { symbol, currentPrice } = workerData;
    const result = await evaluateStrategy(symbol, currentPrice);
    parentPort.postMessage({ success: true, data: result });
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message, symbol: workerData.symbol });
  }
})();
