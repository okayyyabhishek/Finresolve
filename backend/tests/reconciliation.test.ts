import mongoose from 'mongoose';
import { DataGenerator } from '../src/services/dataGenerator';
import { ReconciliationEngine } from '../src/services/reconciliationEngine';
import { Decimal } from '../src/utils/decimal';

// Mock MongoDB connection in tests or connect in-memory
describe('Reconciliation Engine Anomaly Detection Tests', () => {
  beforeAll(async () => {
    // If not connected, we can test deterministic components
  });

  test('should verify reconciliation tolerance boundary (₹0.01)', () => {
    const expected = new Decimal('100.00');
    const actual1 = new Decimal('100.005');
    const actual2 = new Decimal('100.02');

    const diff1 = actual1.minus(expected).abs();
    const diff2 = actual2.minus(expected).abs();

    expect(diff1.lte('0.01')).toBe(true);
    expect(diff2.gt('0.01')).toBe(true);
  });
});
