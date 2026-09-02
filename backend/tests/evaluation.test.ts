import { Decimal } from '../src/utils/decimal';

describe('Evaluation & Coverage-Risk Metric Formulas Tests', () => {
  test('should accurately calculate coverage and accuracy ratios', () => {
    const totalExceptions = 40;
    const autoResolved = 20;
    const correctlyAutoResolved = 19;
    const incorrectlyAutoResolved = 1;

    const coverage = (autoResolved / totalExceptions) * 100;
    const accuracy = (correctlyAutoResolved / autoResolved) * 100;
    const errorRate = (incorrectlyAutoResolved / autoResolved) * 100;

    expect(coverage).toBe(50);
    expect(accuracy).toBe(95);
    expect(errorRate).toBe(5);
  });

  test('should calculate financial error exposure summing only incorrect auto-resolutions', () => {
    const incorrect1 = new Decimal('12.50');
    const incorrect2 = new Decimal('45.00');
    const correctlyResolvedImpact = new Decimal('500.00');

    const totalExposure = incorrect1.plus(incorrect2);
    expect(totalExposure.toFixed(2)).toBe('57.50');
  });
});
