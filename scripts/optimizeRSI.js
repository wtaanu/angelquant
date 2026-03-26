/**
 * optimizeRSI.js — sweep RSI thresholds 25-45, find the best win rate
 * Usage: node scripts/optimizeRSI.js
 */
const { execSync } = require('child_process');
const thresholds = [25,27,28,30,32,35,38,40,42,45];
console.log('\n📈 RSI Threshold Optimization\n');
console.log('RSI\tTrades\tWin%\tNet P&L\tPF');
console.log('-'.repeat(50));
for (const rsi of thresholds) {
  try {
    const out = execSync(`node scripts/backtest.js --rsi ${rsi} --ema 200`, { encoding:'utf8' });
    const trades = (out.match(/Total trades\s*:\s*(\d+)/)  ||[])[1]||'-';
    const winPct = (out.match(/Win rate\s*:\s*([\d.]+)/)   ||[])[1]||'-';
    const pnl    = (out.match(/Net P&L.*:\s*([-\d.]+)/)    ||[])[1]||'-';
    const pf     = (out.match(/Profit factor\s*:\s*([\d.]+)/)||[])[1]||'-';
    console.log(`${rsi}\t${trades}\t${winPct}%\t${pnl}\t${pf}`);
  } catch(e) { console.log(`${rsi}\tERROR`); }
}
console.log('\n✅ Done!\n');
