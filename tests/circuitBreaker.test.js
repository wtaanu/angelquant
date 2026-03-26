jest.mock('../src/db/trades', () => ({ getDailyLoss: jest.fn() }));
jest.mock('../src/db/connection', () => ({ query: jest.fn().mockResolvedValue([]) }));

const { getDailyLoss } = require('../src/db/trades');
const { checkCircuitBreaker, resetForTesting, LIMIT_AMOUNT } = require('../src/execution/circuitBreaker');

beforeEach(() => { resetForTesting(); jest.clearAllMocks(); });

describe('Circuit Breaker', () => {
  test('does NOT trip when loss is 0', async () => {
    getDailyLoss.mockResolvedValue(0);
    expect(await checkCircuitBreaker()).toBe(false);
  });
  test('does NOT trip below limit', async () => {
    getDailyLoss.mockResolvedValue(LIMIT_AMOUNT * 0.5);
    expect(await checkCircuitBreaker()).toBe(false);
  });
  test('trips exactly at limit', async () => {
    getDailyLoss.mockResolvedValue(LIMIT_AMOUNT);
    expect(await checkCircuitBreaker()).toBe(true);
  });
  test('trips when loss exceeds limit', async () => {
    getDailyLoss.mockResolvedValue(LIMIT_AMOUNT * 1.5);
    expect(await checkCircuitBreaker()).toBe(true);
  });
  test('stays tripped on subsequent calls', async () => {
    getDailyLoss.mockResolvedValue(LIMIT_AMOUNT * 2);
    await checkCircuitBreaker();
    getDailyLoss.mockResolvedValue(0);
    expect(await checkCircuitBreaker()).toBe(true);
  });
  test('LIMIT_AMOUNT is 2% of 500000', () => {
    expect(LIMIT_AMOUNT).toBe(10000);
  });
});
