const { query } = require('./connection');

async function insertCandles(rows) {
  if (!rows.length) return;
  const sql = `INSERT IGNORE INTO candles (symbol, timeframe, open_time, open, high, low, close, volume) VALUES ?`;
  const db = require('./connection').getPool();
  const [result] = await db.query(sql, [rows]);
  return result.affectedRows;
}

async function getRecentCloses(symbol, timeframe, limit = 220) {
  const rows = await query(
    `SELECT close FROM candles WHERE symbol = ? AND timeframe = ? ORDER BY open_time DESC LIMIT ?`,
    [symbol, timeframe, limit]
  );
  return rows.map(r => parseFloat(r.close)).reverse();
}

async function getLatestClose(symbol, timeframe = '5m') {
  const rows = await query(
    `SELECT close, open_time FROM candles WHERE symbol = ? AND timeframe = ? ORDER BY open_time DESC LIMIT 1`,
    [symbol, timeframe]
  );
  return rows[0] || null;
}

module.exports = { insertCandles, getRecentCloses, getLatestClose };
