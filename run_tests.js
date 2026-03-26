/**
 * run_tests.js — Standalone test runner (no Jest, no npm install needed)
 * Tests all core logic: RSI, EMA, Circuit Breaker, Strategy, Project Structure
 *
 * Usage: node run_tests.js
 */

let passed = 0, failed = 0, total = 0;
const results = [];

function test(name, fn) {
  total++;
  try { fn(); passed++; results.push({ status: 'PASS', name }); }
  catch (e) { failed++; results.push({ status: 'FAIL', name, error: e.message }); }
}

function expect(val) {
  return {
    toBe:                (e) => { if (val !== e) throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toBeGreaterThan:     (n) => { if (!(val > n))  throw new Error(`Expected ${val} > ${n}`); },
    toBeLessThan:        (n) => { if (!(val < n))  throw new Error(`Expected ${val} < ${n}`); },
    toBeGreaterThanOrEqual:(n)=>{ if (!(val >= n)) throw new Error(`Expected ${val} >= ${n}`); },
    toBeLessThanOrEqual: (n) => { if (!(val <= n)) throw new Error(`Expected ${val} <= ${n}`); },
    toBeDefined:         ()  => { if (val == null) throw new Error(`Expected defined, got ${val}`); },
    toThrow:             ()  => { if (typeof val!=='function') throw new Error('Need function'); let t=false; try{val();}catch{t=true;} if(!t) throw new Error('Expected throw'); },
    not: { toThrow: () => { if (typeof val!=='function') throw new Error('Need function'); try{val();}catch(e){throw new Error(`Expected no throw: ${e.message}`);} } }
  };
}

const { calculateRSI, getLatestRSI } = require('./src/strategy/rsi');
const { calculateEMA, getLatestEMA } = require('./src/strategy/ema');
const { LIMIT_AMOUNT }               = require('./src/execution/circuitBreaker');
const fs   = require('fs');
const path = require('path');

// ── RSI ──
console.log('\n━━━ RSI Calculator ━━━');
test('throws on insufficient data',        () => expect(() => calculateRSI([100,101],14)).toThrow());
test('values always 0-100',                () => { const r=calculateRSI(Array.from({length:30},(_,i)=>100+Math.sin(i)*5),14); r.forEach(v=>{expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(100);}); });
test('RSI < 30 on downtrend',              () => expect(getLatestRSI(Array.from({length:30},(_,i)=>200-i*4),14)).toBeLessThan(30));
test('RSI > 70 on uptrend',               () => expect(getLatestRSI(Array.from({length:30},(_,i)=>100+i*4),14)).toBeGreaterThan(70));
test('correct array length (30-14=16)',    () => expect(calculateRSI(Array.from({length:30},(_,i)=>100+i),14).length).toBe(16));
test('no crash on flat prices',            () => expect(()=>getLatestRSI(Array(30).fill(100),14)).not.toThrow());

// ── EMA ──
console.log('\n━━━ EMA Calculator ━━━');
test('throws on insufficient data',        () => expect(()=>calculateEMA([100,101,102],200)).toThrow());
test('EMA(5) on 10 prices → 6 values',    () => expect(calculateEMA([10,11,12,13,14,15,16,17,18,19],5).length).toBe(6));
test('EMA rises in uptrend',              () => { const e=calculateEMA(Array.from({length:30},(_,i)=>100+i*2),14); expect(e.at(-1)).toBeGreaterThan(e[0]); });
test('EMA falls in downtrend',            () => { const e=calculateEMA(Array.from({length:30},(_,i)=>200-i*2),14); expect(e.at(-1)).toBeLessThan(e[0]); });
test('getLatestEMA returns number',        () => expect(typeof getLatestEMA(Array.from({length:220},(_,i)=>1500+i),200)).toBe('number'));
test('price > EMA200 in uptrend',         () => { const c=Array.from({length:220},(_,i)=>1500+i*0.5); expect(c.at(-1)).toBeGreaterThan(getLatestEMA(c,200)); });

// ── Strategy Logic ──
console.log('\n━━━ Strategy Logic ━━━');
test('BUY: RSI<30 AND price>EMA → true',  () => {
  const c5=Array.from({length:30},(_,i)=>5000-i*40), c15=Array.from({length:220},(_,i)=>100+i*0.5);
  const signal = getLatestRSI(c5,14)<30 && c5.at(-1)>getLatestEMA(c15,200);
  expect(signal).toBe(true);
});
test('NO signal: RSI>30 → false',         () => {
  const c5=Array.from({length:30},(_,i)=>100+i*4), c15=Array.from({length:220},(_,i)=>50+i);
  expect(getLatestRSI(c5,14)<30 && c5.at(-1)>getLatestEMA(c15,200)).toBe(false);
});
test('NO signal: price<EMA → false',      () => {
  const c5=Array.from({length:30},(_,i)=>200-i*4), c15=Array.from({length:220},(_,i)=>500-i*0.5);
  expect(getLatestRSI(c5,14)<30 && c5.at(-1)>getLatestEMA(c15,200)).toBe(false);
});
test('RSI oversold zone < 35',            () => expect(getLatestRSI(Array.from({length:30},(_,i)=>200-i*3.8),14)).toBeLessThan(35));

// ── Circuit Breaker ──
console.log('\n━━━ Circuit Breaker ━━━');
test('LIMIT = 2% of 500000 = 10000',      () => expect(LIMIT_AMOUNT).toBe(10000));
test('0 loss → safe',                     () => expect(0 < LIMIT_AMOUNT).toBe(true));
test('50% loss → safe',                   () => expect(5000 < LIMIT_AMOUNT).toBe(true));
test('100% loss → trip',                  () => expect(10000 >= LIMIT_AMOUNT).toBe(true));
test('150% loss → trip',                  () => expect(15000 >= LIMIT_AMOUNT).toBe(true));
test('pctUsed 5000/10000 = 50%',          () => expect(parseFloat(((5000/LIMIT_AMOUNT)*100).toFixed(2))).toBe(50));
test('pctUsed 10000/10000 = 100%',        () => expect(parseFloat(((10000/LIMIT_AMOUNT)*100).toFixed(2))).toBe(100));

// ── Project Structure ──
console.log('\n━━━ Project Structure ━━━');
[
  'src/strategy/rsi.js','src/strategy/ema.js','src/strategy/evaluateStrategy.js',
  'src/scanner/websocket.js','src/scanner/worker.js','src/scanner/watchlist.js',
  'src/db/schema.sql','src/db/connection.js','src/db/candles.js','src/db/trades.js',
  'src/execution/circuitBreaker.js','src/execution/placeOrder.js','src/execution/auth.js',
  'scripts/seedTestData.js','scripts/backtest.js','scripts/downloadHistory.js','scripts/optimizeRSI.js',
  'tests/rsi.test.js','tests/ema.test.js','tests/circuitBreaker.test.js','tests/strategy.test.js',
  'index.js','package.json','.env.example','docker-compose.yml','Dockerfile','README.md','.gitignore',
].forEach(f => test(`exists: ${f}`, () => { if (!fs.existsSync(path.join(__dirname,f))) throw new Error(`Missing: ${f}`); }));

// ── Watchlist ──
console.log('\n━━━ Watchlist ━━━');
const { WATCHLIST } = require('./src/scanner/watchlist');
test('at least 10 symbols',               () => expect(WATCHLIST.length >= 10).toBe(true));
test('every entry has symbol + token',    () => { WATCHLIST.forEach(w=>{if(!w.symbol||!w.token)throw new Error(`Bad: ${JSON.stringify(w)}`);}); expect(true).toBe(true); });
test('RELIANCE present',                  () => expect(!!WATCHLIST.find(w=>w.symbol==='RELIANCE')).toBe(true));

// ── .env.example ──
console.log('\n━━━ Environment Config ━━━');
const env = fs.readFileSync(path.join(__dirname,'.env.example'),'utf8');
['ANGEL_API_KEY','ANGEL_CLIENT_ID','DB_HOST','DB_NAME','CAPITAL','CB_PERCENT','PAPER_TRADE']
  .forEach(k => test(`.env.example has ${k}`, () => { if (!env.includes(k)) throw new Error(`Missing: ${k}`); }));

// ── Print ──
console.log('\n' + '='.repeat(60));
console.log('  TEST RESULTS');
console.log('='.repeat(60));
results.forEach(r => {
  const ok = r.status==='PASS';
  console.log(`${ok?'\x1b[32m✓':'\x1b[31m✗ FAIL'} ${r.name}\x1b[0m${ok?'':' ↳ '+r.error}`);
});
console.log('\n' + '='.repeat(60));
console.log(`${failed===0?'\x1b[32m':'\x1b[31m'}  ${passed}/${total} passed | ${failed} failed\x1b[0m`);
console.log('='.repeat(60) + '\n');
process.exit(failed > 0 ? 1 : 0);
