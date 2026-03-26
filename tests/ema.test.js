const { calculateEMA, getLatestEMA } = require('../src/strategy/ema');

describe('EMA Calculator', () => {
  test('throws if not enough data', () => {
    expect(() => calculateEMA([100, 101, 102], 200)).toThrow();
  });
  test('EMA(5) on 10 prices returns 6 values', () => {
    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    expect(calculateEMA(closes, 5).length).toBe(6);
  });
  test('EMA follows uptrend', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const ema = calculateEMA(closes, 14);
    expect(ema.at(-1)).toBeGreaterThan(ema[0]);
  });
  test('EMA follows downtrend', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
    const ema = calculateEMA(closes, 14);
    expect(ema.at(-1)).toBeLessThan(ema[0]);
  });
  test('getLatestEMA returns a single number', () => {
    const closes = Array.from({ length: 220 }, (_, i) => 1500 + i);
    expect(typeof getLatestEMA(closes, 200)).toBe('number');
  });
  test('price above EMA in uptrend', () => {
    const closes = Array.from({ length: 220 }, (_, i) => 1500 + i * 0.5);
    expect(closes.at(-1)).toBeGreaterThan(getLatestEMA(closes, 200));
  });
});
