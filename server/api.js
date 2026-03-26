/**
 * server/api.js — Express REST API
 * Serves the frontend + exposes live data from MySQL
 *
 * GET  /api/status        → system status, CB state, capital
 * GET  /api/scanner       → latest RSI+EMA for all watchlist symbols
 * GET  /api/trades        → open + today's closed trades
 * GET  /api/signals       → last 50 signals fired
 * GET  /api/backtest      → run backtest on-demand (?rsi=30&ema=200)
 * GET  /api/candles/:sym  → last 100 candles for a symbol
 * POST /api/cb/reset      → reset circuit breaker (paper mode only)
 * GET  /api/db/status     → MySQL connection health
 */
require('dotenv').config();
const express  = require('express');
const path     = require('path');
const { query, testConnection } = require('../src/db/connection');
const { WATCHLIST }             = require('../src/scanner/watchlist');
const { calculateRSI }          = require('../src/strategy/rsi');
const { calculateEMA }          = require('../src/strategy/ema');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend/public')));

function safeJson(res, data) { res.json({ ok: true, data, ts: new Date().toISOString() }); }
function errJson(res, err, status = 500) { res.status(status).json({ ok: false, error: err.message || String(err) }); }

app.get('/api/db/status', async (req, res) => { try { const ok = await testConnection(); safeJson(res, { connected: ok, host: process.env.DB_HOST, db: process.env.DB_NAME }); } catch (e) { errJson(res, e); } });

app.get('/api/status', async (req, res) => { try { const [cbRow] = await query('SELECT * FROM cb_log ORDER BY logged_at DESC LIMIT 1').catch(()=>[null]); const [tRow] = await query("SELECT COUNT(*) AS c FROM trades WHERE status='OPEN'").catch(()=>[{c:0}]); const [pnlRow] = await query('SELECT COALESCE(SUM(pnl),0) AS p FROM trades WHERE trade_date=CURDATE()').catch(()=>[{p:0}]); const capital = parseFloat(process.env.CAPITAL  || 500000); const cbPct = parseFloat(process.env.CB_PERCENT || 2); const limit = capital * cbPct / 100; const loss = cbRow ? parseFloat(cbRow.loss_amount||0) : 0; safeJson(res, { paper_trade: process.env.PAPER_TRADE !== 'false', capital, cb_limit: limit, cb_pct_config: cbPct, cb_pct_used: parseFloat(((loss/limit)*100).toFixed(2)), cb_tripped: cbRow ? !!cbRow.tripped : false, open_positions: parseInt(tRow.c||0), max_positions: parseInt(process.env.MAX_POSITIONS||5), daily_pnl: parseFloat(parseFloat(pnlRow.p||0).toFixed(2)), rsi_threshold: parseFloat(process.env.RSI_THRESHOLD||30), ema_period: parseInt(process.env.EMA_PERIOD||200) }); } catch (e) { errJson(res, e); } });

app.get('/api/scanner', async (req, res) => { try { const RSI_THRESHOLD = parseFloat(process.env.RSI_THRESHOLD || 30); const EMA_PERIOD = parseInt(process.env.EMA_PERIOD || 200); const results = []; for (const { symbol } of WATCHLIST) { try { const rows5m = await query('SELECT close FROM candles WHERE symbol=? AND timeframe=\'5m\' ORDER BY open_time DESC LIMIT 30', [symbol]); const rows15m = await query('SELECT close FROM candles WHERE symbol=? AND timeframe=\'15m\' ORDER BY open_time DESC LIMIT 220', [symbol]); if (rows5m.length < 15 || rows15m.length < EMA_PERIOD) { results.push({ symbol, rsi: null, ema: null, price: null, signal: false, status: 'no_data' }); continue; } const c5 = rows5m.map(r => parseFloat(r.close)).reverse(); const c15 = rows15m.map(r => parseFloat(r.close)).reverse(); const rsi = parseFloat(c5.length > 14 ? (()=>{ try{ return calculateRSI(c5,14).at(-1).toFixed(2); }catch{return null;} })() : null); const ema = parseFloat(c15.length >= EMA_PERIOD ? (()=>{ try{ return calculateEMA(c15, EMAPERIOD).at(-1).toFixed(2); }catch{return null;} })() : null); const price = c5.at(-1); const signal = rsi !== null && ema !== null && rsi < RSI_THRESHOLD && price > ema; results.push({ symbol, rsi, ema, price: parseFloat(price.toFixed(2)), signal, status: 'ok' }); } catch { results.push({ symbol, rsi: null, ema: null, price: null, signal: false, status: 'error' }); } } safeJson(res, results); } catch (e) { errJson(res, e); } });

app.get('/api/trades', async (req, res) => { try { const open = await query("SELECT * FROM trades WHERE status='OPEN' ORDER BY created_at DESC").catch(()=>[]); const closed = await query("SELECT * FROM trades WHERE trade_date=CURDATE() AND status='CLOSED' ORDER BY closed_at DESC LIMIT 20").catch(()=>[]); safeJson(res, { open, closed }); } catch (e) { errJson(res, e); } });
app.get('/api/signals', async (req, res) => { try { const rows = await query('SELECT * FROM signals ORDER BY signal_at DESC LIMIT 50').catch(()=>[]); safeJson(res, rows); } catch (e) { errJson(res, e); } });
app.get('/api/candles/:symbol', async (req, res) => { try { const { symbol } = req.params; const tf = req.query.tf || '5m'; const rows = await query('SELECT * FROM candles WHERE symbol=? AND timeframe=? ORDER BY open_time DESC LIMIT 100', [symbol.toUpperCase(), tf]).catch(()=>[]); safeJson(res, rows.reverse()); } catch (e) { errJson(res, e); } });
app.post('/api/cb/reset', async (req, res) => { try { if (process.env.PAPER_TRADE === 'false') { return errJson(res, new Error('Cannot reset CB in live mode'), 403); } await query("INSERT INTO cb_log (logged_at, loss_amount, limit_amount, pct_used, tripped, action) VALUES (NOW(), 0, 0, 0, 0, 'MANUAL RESET')").catch(()=>{}); safeJson(res, { reset: true }); } catch (e) { errJson(res, e); } });
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/public/index.html')); });
app.listen(PORT, async () => { console.log(`\n🚀 AngelQuant Server at http://localhost:${PORT}`); const dbOk = await testConnection(); console.log(`   MySQL: ${dbOk ? '✓ connected' : '✗ offline - run db:setup'}\n`); });
module.exports = app;
