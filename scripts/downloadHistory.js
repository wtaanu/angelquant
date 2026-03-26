/**
 * downloadHistory.js — downloads OHLCV candles from Angel One SmartAPI
 * Usage:
 *   node scripts/downloadHistory.js --symbol RELIANCE --tf FIVE_MINUTE
 *   node scripts/downloadHistory.js --all
 */
require('dotenv').config();
const axios              = require('axios');
const { getAuthToken }   = require('../src/execution/auth');
const { insertCandles }  = require('../src/db/candles');
const { WATCHLIST }      = require('../src/scanner/watchlist');

const TF_MAP = { ONE_MINUTE:'1m', FIVE_MINUTE:'5m', FIFTEEN_MINUTE:'15m', ONE_HOUR:'1h', ONE_DAY:'1d' };
const args   = process.argv.slice(2);
const getArg = (n,d) => { const i=args.indexOf('--'+n); return i!==-1?args[i+1]:d; };
const allSym = args.includes('--all');
const symbol = getArg('symbol','RELIANCE');
const tf     = getArg('tf','FIVE_MINUTE');

function getDateRange() {
  const to=new Date(), from=new Date(Date.now()-180*24*60*60*1000);
  const fmt=d=>d.toISOString().slice(0,16).replace('T',' ');
  return { fromdate:fmt(from), todate:fmt(to) };
}

async function downloadSymbol(sym, timeframe, token) {
  const { fromdate,todate } = getDateRange();
  const entry = WATCHLIST.find(w=>w.symbol===sym);
  if (!entry) { console.warn(`  ${sym} not in watchlist`); return; }
  const { data } = await axios.post(
    'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
    { exchange:'NSE', symboltoken:entry.token, interval:timeframe, fromdate, todate },
    { headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json', 'X-PrivateKey':process.env.ANGEL_API_KEY, 'X-UserType':'USER','X-SourceID':'WEB' } }
  );
  if (!data.status) throw new Error(`API: ${data.message}`);
  const tf_short = TF_MAP[timeframe]||'5m';
  const rows = data.data.map(c=>[sym,tf_short,c[0].slice(0,19).replace('T',' '),c[1],c[2],c[3],c[4],c[5]]);
  const inserted = await insertCandles(rows);
  console.log(`  ✓ ${sym} ${tf_short}: ${inserted} candles saved`);
}

async function main() {
  const jwt    = await getAuthToken();
  const targets = allSym ? WATCHLIST.map(w=>w.symbol) : [symbol];
  const tfs    = [tf, tf==='FIVE_MINUTE'?'FIFTEEN_MINUTE':null].filter(Boolean);
  console.log(`\n📥 Downloading history for ${targets.length} symbol(s)...\n`);
  for (const sym of targets) {
    for (const t of tfs) {
      try { await downloadSymbol(sym,t,jwt); await new Promise(r=>setTimeout(r,300)); }
      catch(e) { console.error(`  ✗ ${sym} ${t}:`,e.message); }
    }
  }
  console.log('\n✅ Done!\n');
  process.exit(0);
}
main().catch(err=>{ console.error(err.message); process.exit(1); });
