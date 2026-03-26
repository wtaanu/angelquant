const { query } = require('./connection');

async function insertSignal({ symbol, rsi_val, ema_val, price }) {
  const rows = await query(
    `INSERT INTO signals (symbol, signal_at, rsi_val, ema_val, price) VALUES (?, NOW(), ?, ?, ?)`,
    [symbol, rsi_val, ema_val, price]
  );
  return rows.insertId;
}

async function insertTrade({ signal_id, symbol, order_id, entry_price, qty, paper_trade = true }) {
  const rows = await query(
    `INSERT INTO trades (signal_id, symbol, order_id, entry_price, qty, trade_date, paper_trade) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)`,
    [signal_id, symbol, order_id, entry_price, qty, paper_trade]
  );
  return rows.insertId;
}

async function closeTrade(trade_id, exit_price) {
  const trade = (await query('SELECT * FROM trades WHERE id = ?', [trade_id]))[0];
  if (!trade) return null;
  const pnl = (exit_price - trade.entry_price) * trade.qty;
  await query(
    `UPDATE trades SET exit_price = ?, pnl = ?, status = 'CLOSED', closed_at = NOW() WHERE id = ?`,
    [exit_price, pnl, trade_id]
  );
  return pnl;
}

async function getDailyLoss() {
  const rows = await query(
    `SELECT COALESCE(SUM(pnl), 0) AS total FROM trades WHERE trade_date = CURDATE() AND pnl < 0`
  );
  return Math.abs(parseFloat(rows[0].total));
}

async function getOpenTrades() {
  return query(`SELECT * FROM trades WHERE status = 'OPEN'`);
}

module.exports = { insertSignal, insertTrade, closeTrade, getDailyLoss, getOpenTrades };
