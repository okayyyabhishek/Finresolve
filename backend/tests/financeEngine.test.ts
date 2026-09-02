import { FinanceEngine } from '../src/services/financeEngine';
import { Decimal, toDecimal } from '../src/utils/decimal';

describe('FinanceEngine Precision & Arithmetic Tests', () => {
  test('should calculate fee accurately for UPI (0.25%) without floating point drift', () => {
    const amount = new Decimal('10000.00');
    const result = FinanceEngine.calculateFee(amount, 'upi');

    // Base fee = 10000 * 0.0025 = 25.00
    expect(result.baseFee.toFixed(2)).toBe('25.00');
    // GST = 25.00 * 0.18 = 4.50
    expect(result.gst.toFixed(2)).toBe('4.50');
    // Total Fee = 29.50
    expect(result.totalFee.toFixed(2)).toBe('29.50');
  });

  test('should calculate fee accurately for Card (2.0%)', () => {
    const amount = new Decimal('2499.50');
    const result = FinanceEngine.calculateFee(amount, 'card');

    // Base fee = 2499.50 * 0.02 = 49.99
    expect(result.baseFee.toFixed(2)).toBe('49.99');
    // GST = 49.99 * 0.18 = 8.9982 -> rounded 9.00
    expect(result.gst.toFixed(2)).toBe('9.00');
    // Total Fee = 58.99
    expect(result.totalFee.toFixed(2)).toBe('58.99');
  });

  test('should calculate expected settlement deducting fee, GST, refunds, and adjustments', () => {
    const paymentAmount = new Decimal('5000.00');
    const fee = new Decimal('100.00');
    const gst = new Decimal('18.00');
    const refunds = [{ amount: new Decimal('500.00') }];
    const adjustments = [{ amount: new Decimal('250.00'), type: 'chargeback' }];

    const result = FinanceEngine.calculateExpectedSettlement(
      paymentAmount,
      fee,
      gst,
      refunds,
      adjustments
    );

    // Expected = 5000 - 100 - 18 - 500 - 250 = 4132.00
    expect(result.expectedNetAmount.toFixed(2)).toBe('4132.00');
  });

  test('should calculate discrepancy and direction correctly', () => {
    const expected = new Decimal('4132.00');
    const actual = new Decimal('4000.00');

    const result = FinanceEngine.calculateDiscrepancy(expected, actual);

    // Discrepancy = 4000 - 4132 = -132.00
    expect(result.discrepancy.toFixed(2)).toBe('-132.00');
    expect(result.direction).toBe('shortfall');

    const impact = FinanceEngine.calculateFinancialImpact(result);
    expect(impact.toFixed(2)).toBe('132.00');
  });
});
