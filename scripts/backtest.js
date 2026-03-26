/**
 * backtest.js — run RSI+EMA strategy against historical MySQL data
 * Usage:
 *   node scripts/backtest.js                     # RSI=30, EMA=200
 *   node scripts/backtest.js --rsi 35 --ema 200
 */
require('dotenv').config();
const { getPool }      = require('../src/db/connection');
const { calculateRSI } = require('../src/strategy/rsi');
const { calculateEMA } = require('../src/strategy/ema');

const args   = process.argv.slice(2);
const getArg = (n,d) => { const i=args.indexOf('--'+n); return i!==-1?parseFloat(args[i+1]):d; };
const RSI_THRESHOLD = getArg('rsi', 30);
const EMA_PERIOD    = getArg('ema', 200);
const RSI_PERIOD    = 14;

async function backtest() {
  const pool    = getPool();
  const symbols = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK'];
  console.log(`\n📊 Backtest — RSI<${RSI_THRESHOLD} + Price>EMA(${EMA_PERIOD})\n`);
  let totalTrades=0,wins=0,totalPnl=0,maxDd=0,peakPnl=0;
  const all=[];

  for (const sym of symbols) {
    const [r5]  = await pool.query(`SELECT close FROM candles WHERE symbol=? AND timeframe='5m'  ORDER BY open_time ASC`,[sym]);
    const [r15] = await pool.query(`SELECT close FROM candles WHERE symbol=? AND timeframe='15m' ORDER BY open_time ASC`,[sym]);
    const c5  = r5.map(r=>parseFloat(r.close));
    const c15 = r15.map(r=>parseFloat(r.close));
    if (c5.length < RSI_PERIOD+1 || c15.length < EMA_PERIOD) { console.log(`  ⚠ ${sym}: not enough data`); continue; }
    const rsiArr = calculateRSI(c5, RSI_PERIOD);
    const emaArr = calculateEMA(c15, EMA_PERIOD);
    let inTrade=false, entryPrice=0;
    for (let i=RSI_PERIOD; i<rsiArr.length-10; i++) {
      const rsi=rsiArr[i], price=c5[RSI_PERIOD+i], ema=emaArr[Math.min(i,emaArr.length-1)];
      if (!inTrade && rsi<RSI_THRESHOLD && price>ema) { inTrade=true; entryPrice=price; }
      else if (inTrade) {
        const exit=c5[RSI_PERIOD+i+10], pnl=exit-entryPrice;
        totalPnl+=pnl; totalTrades++; if(pnl>0)wins++;
        if(totalPnl>peakPnl)peakPnl=totalPnl;
        const dd=peakPnl-totalPnl; if(dd>maxDd)maxDd=dd;
        all.push({pnl}); inTrade=false;
      }
    }
  }
  const winRate  = totalTrades ? ((wins/totalTrades)*100).toFixed(1) : 0;
  const avgPnl   = totalTrades ? (totalPnl/totalTrades).toFixed(2) : 0;
  const posSum   = all.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0);
  const negSum   = Math.abs(all.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0));
  const pf       = negSum ? (posSum/negSum).toFixed(2) : 'N/A';

  console.log(`  RSI threshold : ${RSI_THRESHOLD}`);
  console.log(`  EMA period    : ${EMA_PERIOD}`);
  console.log(`  Total trades  : ${totalTrades}`);
  console.log(`  Win rate      : ${winRate}%`);
  console.log(`  Net P&L (pts) : ${totalPnl.toFixed(2)}`);
  console.log(`  Avg P&L/trade : ${avgPnl}`);
  console.log(`  Max drawdown  : ${maxDd.toFixed(2)}`);
  console.log(`  Profit factor : ${pf}`);
  console.log();
  process.exit(0);
}
backtest().catch(err=>{ console.error('Backtest failed:',err.message); process.exit(1); });
