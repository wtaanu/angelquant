/**
 * scripts/setup_db.js
 * ─────────────────────────────────────────────────────────
 * One-command database setup for Windows/Mac/Linux.
 * Does NOT need mysql.exe in your PATH.
 * Uses your ROOT credentials to create the app user + tables.
 *
 * Usage:
 *   node scripts/setup_db.js
 *   node scripts/setup_db.js --root-pass yourpassword
 *
 * Or set env vars:
 *   DB_ROOT_PASS=yourpassword node scripts/setup_db.js
 * ─────────────────────────────────────────────────────────
 */

const mysql  = require('mysql2/promise');
const readline = require('readline');

const args    = process.argv.slice(2);
const getArg  = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i+1] : null; };

const DB_HOST      = getArg('--host')      || process.env.DB_HOST      || 'localhost';
const DB_PORT      = getArg('--port')      || process.env.DB_PORT      || 3306;
const ROOT_USER    = getArg('--root-user') || process.env.DB_ROOT_USER || 'root';
const ROOT_PASS_ARG= getArg('--root-pass') || process.env.DB_ROOT_PASS || null;
const APP_DB       = getArg('--db')        || process.env.DB_NAME      || 'angelquant_db';
const APP_USER     = getArg('--app-user')  || process.env.DB_USER      || 'aquser';
const APP_PASS     = getArg('--app-pass')  || process.env.DB_PASS      || 'aqpass123';

async function promptPassword() {
  if (ROOT_PASS_ARG !== null) return ROOT_PASS_ARG;
  if (process.env.DB_ROOT_PASS) return process.env.DB_ROOT_PASS;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`MySQL ${ROOT_USER} password: `, (ans) => { rl.close(); resolve(ans); });
  });
}

async function setup() {
  console.log('\n\n==================================');
  console.log('  AngelQuant - Database Setup');
  console.log('==================================');
  console.log(`  Host : ${DB_HOST}:${DB_PORT}`);
  console.log(`  Root : ${ROOT_USER}`);
  console.log(`  DB   : ${APP_DB}`);
  console.log(`  User : ${APP_USER} / ${APP_PASS}`);
  console.log('');

  const rootPass = await promptPassword();
  let conn;
  try {
    conn = await mysql.createConnection({ host: DB_HOST, port: DB_PORT, user: ROOT_USER, password: rootPass });
    console.log('  [ OK ] Connected to MySQL as root\n');
  } catch (err) {
    console.error(`\n  [ERR] Cannot connect: ${err.message}`);
    console.error('  Fix: net start MySQL80  (run as Admin)');
    process.exit(1);
  }

  const run = async (sql, msg) => {
    try { await conn.execute(sql); console.log('  [ OK ] ' + msg); }
    catch (e) {
      if (e.code==='ER_DB_CREATE_EXISTS'||e.code==='ER_CANNOT_USER') { console.log('  [SKIP] ' + msg + ' (already exists)'); }
      else { console.error('  [ERR] ' + msg + ': ' + e.message); throw e; }
    }
  };

  try {
    await run(`CREATE DATABASE IF NOT EXISTS \`${APP_DB}\``, `Create DB '${APP_DB}'`);
    await run(`CREATE USER IF NOT EXISTS '${APP_USER}'@'localhost' IDENTIFIED BY '${APP_PASS}'`, `Create user '${APP_USER}'@'localhost'`);
    await run(`CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASS}'`, `Create user '${APP_USER}'@'%'`);
    await run(`GRANT ALL PRIVILEGES ON \`${APP_DB}\`.* TO '${APP_USER}'@'localhost'`, `Grant privileges to ${APP_USER}`);
    await run(`GRANT ALL PRIVILEGES ON \`${APP_DB}\`.* TO '${APP_USER}'@'%'`, `Grant remote privileges`);
    await conn.execute('FLUSH PRIVILEGES');
    console.log('  [ OK ] Privileges flushed');
    await conn.changeUser({ database: APP_DB });
    console.log(`\n  Creating tables in '${APP_DB}'...`);
    await run(`CREATE TABLE IF NOT EXISTS candles (id BIGINT AUTO_INCREMENT PRIMARY KEY, symbol VARCHAR(20) NOT NULL, timeframe ENUM('1m','5m','15m','1h','1d') NOT NULL, open_time DATETIME NOT NULL, open DECIMAL(12,2), high DECIMAL(12,2), low DECIMAL(12,2), close DECIMAL(12,2), volume BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_candle (symbol, timeframe, open_time), INDEX idx_symbol_tf (symbol, timeframe, open_time))`, 'Table: candles');
    await run(`CREATE TABLE IF NOT EXISTS signals (id BIGINT AUTO_INCREMENT PRIMARY KEY, symbol VARCHAR(20) NOT NULL, signal_at DATETIME NOT NULL, rsi_val DECIMAL(6,2), ema_val DECIMAL(12,2), price DECIMAL(12,2), executed BOOLEAN DEFAULT FALSE, trade_id BIGINT DEFAULT NULL, created_at TIMESTAMP DAEFAULT CURRENT_TIMESTAMP, INDEX idx_symbol_date (symbol, signal_at))`, 'Table: signals');
    await run(`CREATE TABLE IF NOT EXISTS trades (id BIGINT AUTO_INCREMENT PRIMARY KEY, signal_id BIGINT DEFAULT NULL, symbol VARCHAR(20) NOT NULL, order_id VARCHAR(50) DEFAULT NULL, entry_price DECIMAL(12,2), exit_price DECIMAL(12,2) DEFAULT NULL, qty INT, pnl DECIMAL(12,2) DEFAULT NULL, strategy VARCHAR(50) DEFAULT 'RSI_EMA', status ENUM('OPEN','CLOSED','CANCELLED') DEFAULT 'OPEN', trade_date DATE NOT NULL, cb_blocked BOOLEAN DEFAULT FALSE, paper_trade BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DAEFAULT CURRENT_TIMESTAMP, closed_at TIMESTAMP DAEFAULT NUML, INDEX idx_date (trade_date), INDEX idx_symbol (symbol))`, 'Table: trades');
    await run(`CREATE TABLE IF NOT EXISTS cb_log (id BIGINT AUTO_INCREMENT PRIMARY KEY, logged_at DATETIME NOT NULL, loss_amount DECIMAL(12,2), limit_amount DECIMAL(12,2), pct_used DECIMAL(5,2), tripped BOOLEAN DEFAULT FALSE, action VARCHAR(100), INDEX idx_date (logged_at))`, 'Table: cb_log');
    const [tables] = await conn.execute('SHOW TABLES');
    console.log(`\n  Tables in '${APP_DB}':`);
    tables.forEach(t => console.log('    ' + Object.values(t)[0]));
    await conn.end();
    console.log('\n==================================');
    console.log('  SETUP COMPLETE!');
    console.log('==================================');
    console.log('\n  next:  npm run seed   ');
    console.log('          npm run server\n');
  } catch (e) {
    console.error('\n Setup failed: '+e.message);
    await conn.end().catch(()=>{});
    process.exit(1);
  }
}
setup();
