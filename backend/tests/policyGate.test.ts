import { PolicyGate } from '../src/services/policyGate';
import { Decimal, toDecimal128 } from '../src/utils/decimal';
import { IException } from '../src/models/Exception';
import { AgentInvestigationOutput } from '../src/services/investigationAgent';

describe('PolicyGate Deterministic Rule Enforcement Tests', () => {
  const createMockException = (overrides: Partial<IException> = {}): IException => {
    return {
      exceptionId: 'EXP-001',
      paymentId: 'PAY-001',
      settlementId: 'STL-001',
      type: 'fee_mismatch',
      severity: 'medium',
      expectedAmount: toDecimal128(new Decimal('1000.00')),
      actualAmount: toDecimal128(new Decimal('995.00')),
      discrepancy: toDecimal128(new Decimal('-5.00')),
      status: 'detected',
      batchId: 'BATCH-TEST',
      ...overrides
    } as any;
  };

  const createMockInvestigation = (overrides: Partial<AgentInvestigationOutput> = {}): AgentInvestigationOutput => {
    return {
      rootCause: 'Fee rate skew',
      evidence: [],
      confidence: 0.95,
      evidenceCompleteness: 0.90,
      recommendedAction: 'auto_resolve',
      reasoning: 'Verified fee discrepancy.',
      agentModel: 'gemini-2.5-flash',
      toolsUsed: ['retrieve_payment_details'],
      durationMs: 120,
      ...overrides
    };
  };

  test('should approve auto_resolve when all checks pass', () => {
    const exp = createMockException();
    const inv = createMockInvestigation();

    const result = PolicyGate.evaluate(inv, exp);

    expect(result.decision).toBe('auto_resolve');
    expect(result.reason).toContain('All deterministic policy rules satisfied');
    expect(result.rulesApplied.every((r) => r.passed)).toBe(true);
  });

  test('should escalate when confidence is below threshold (e.g. 0.80 < 0.85)', () => {
    const exp = createMockException();
    const inv = createMockInvestigation({ confidence: 0.80 });

    const result = PolicyGate.evaluate(inv, exp);

    expect(result.decision).toBe('escalate');
    expect(result.reason).toContain('Confidence 0.80 below threshold 0.85');
  });

  test('should escalate when evidence completeness is below threshold', () => {
    const exp = createMockException();
    const inv = createMockInvestigation({ evidenceCompleteness: 0.70 });

    const result = PolicyGate.evaluate(inv, exp);

    expect(result.decision).toBe('escalate');
    expect(result.reason).toContain('Evidence completeness 0.70 below threshold');
  });

  test('should escalate when financial impact exceeds max limit (e.g. ₹15,000 > ₹10,000)', () => {
    const exp = createMockException({
      discrepancy: toDecimal128(new Decimal('15000.00'))
    });
    const inv = createMockInvestigation();

    const result = PolicyGate.evaluate(inv, exp);

    expect(result.decision).toBe('escalate');
    expect(result.reason).toContain('Financial impact ₹15000.00 exceeds auto-resolve limit');
  });

  test('should escalate when exception type is not in allowed auto-resolve list (e.g. duplicate_settlement)', () => {
    const exp = createMockException({ type: 'duplicate_settlement' });
    const inv = createMockInvestigation();

    const result = PolicyGate.evaluate(inv, exp);

    expect(result.decision).toBe('escalate');
    expect(result.reason).toContain("Exception type 'duplicate_settlement' not allowed");
  });

  test('should escalate when agent recommends escalation', () => {
    const exp = createMockException();
    const inv = createMockInvestigation({ recommendedAction: 'escalate' });

    const result = PolicyGate.evaluate(inv, exp);

    expect(result.decision).toBe('escalate');
    expect(result.reason).toContain("Agent recommended 'escalate'");
  });
});
