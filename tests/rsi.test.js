const { calculateRSI, getLatestRSI } = require('../src/strategy/rsi');

describe('RSI Calculator', () => {
  test('throws if not enough data', () => {
    expect(() => calculateRSI([100, 101], 14)).toThrow();
  });
  test('RSI is between 0 and 100', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5);
    calculateRSI(closes, 14).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });
  test('RSI below 30 on strong downtrend', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 200 - i * 4);
    expect(getLatestRSI(closes, 14)).toBeLessThan(30);
  });
  test('RSI above 70 on strong uptrend', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 4);
    expect(getLatestRSI(closes, 14)).toBeGreaterThan(70);
  });
  test('returns correct array length', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(calculateRSI(closes, 14).length).toBe(16);
  });
});
