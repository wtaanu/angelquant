jest.mock('../src/db/candles', () => ({ getRecentCloses: jest.fn() }));

const { getRecentCloses }  = require('../src/db/candles');
const { evaluateStrategy } = require('../src/strategy/evaluateStrategy');

const downtrend = (n, s=200) => Array.from({length:n}, (_,i) => s - i*1.5);
const uptrend   = (n, s=100) => Array.from({length:n}, (_,i) => s + i*1.5);

describe('evaluateStrategy()', () => {
  test('BUY signal: RSI<30 and price>EMA', async () => {
    getRecentCloses.mockImplementation((s, tf) => tf==='5m' ? downtrend(30,200) : uptrend(220,50));
    const r = await evaluateStrategy('RELIANCE');
    expect(r.isBuySignal).toBe(true);
    expect(r.rsi).toBeLessThan(30);
  });
  test('NO signal: RSI>30', async () => {
    getRecentCloses.mockImplementation((s, tf) => tf==='5m' ? uptrend(30,100) : uptrend(220,50));
    expect((await evaluateStrategy('TCS')).isBuySignal).toBe(false);
  });
  test('NO signal: price<EMA', async () => {
    getRecentCloses.mockImplementation((s, tf) => tf==='5m' ? downtrend(30,200) : downtrend(220,500));
    expect((await evaluateStrategy('INFY')).isBuySignal).toBe(false);
  });
  test('error on insufficient data', async () => {
    getRecentCloses.mockResolvedValue([100, 101]);
    const r = await evaluateStrategy('SBIN');
    expect(r.isBuySignal).toBe(false);
    expect(r.error).toBeDefined();
  });
  test('uses provided currentPrice override', async () => {
    getRecentCloses.mockImplementation((s, tf) => tf==='5m' ? downtrend(30,200) : uptrend(220,50));
    expect((await evaluateStrategy('RELIANCE', 999)).price).toBe(999);
  });
});
