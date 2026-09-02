// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing

import { SeededRandom } from '../utils/seedRandom';
import { Decimal, toDecimal, toDecimal128 } from '../utils/decimal';
import { FinanceEngine } from './financeEngine';
import {
  Payment,
  Settlement,
  Refund,
  Fee,
  Adjustment,
  GroundTruth
} from '../models';

export interface GenerationSummary {
  batchId: string;
  seed: number;
  totalRecords: number;
  matchedRecords: number;
  exceptionRecords: number;
  exceptionsByType: Record<string, number>;
  generatedAt: string;
}

export class DataGenerator {
  private rng: SeededRandom;

  constructor(seed: number = 42) {
    this.rng = new SeededRandom(seed);
  }

  public async generateBatch(
    batchId: string = `BATCH-${Date.now()}`,
    seed: number = 42
  ): Promise<GenerationSummary> {
    this.rng.reseed(seed);

    // 1. Clear existing records for this batch
    await Promise.all([
      Payment.deleteMany({ batchId }),
      Settlement.deleteMany({ batchId }),
      Refund.deleteMany({ batchId }),
      Fee.deleteMany({ batchId }),
      Adjustment.deleteMany({ batchId }),
      GroundTruth.deleteMany({ batchId })
    ]);

    const merchants = Array.from({ length: 10 }, (_, i) => `MER-${String(i + 1).padStart(3, '0')}`);
    const methods: Array<'upi' | 'card' | 'netbanking' | 'wallet'> = [
      'upi',
      'card',
      'netbanking',
      'wallet'
    ];

    const baseDate = new Date('2026-03-01T00:00:00.000Z');
    const endDate = new Date('2026-03-31T23:59:59.000Z');

    const paymentsToInsert: any[] = [];
    const settlementsToInsert: any[] = [];
    const refundsToInsert: any[] = [];
    const feesToInsert: any[] = [];
    const adjustmentsToInsert: any[] = [];
    const groundTruthsToInsert: any[] = [];

    let currentPaymentIdx = 1;
    let currentSettlementIdx = 1;
    let currentRefundIdx = 1;
    let currentFeeIdx = 1;
    let currentAdjustmentIdx = 1;

    const exceptionCounts: Record<string, number> = {
      fee_mismatch: 0,
      gst_mismatch: 0,
      missing_settlement: 0,
      duplicate_settlement: 0,
      partial_settlement: 0,
      refund_not_adjusted: 0,
      duplicate_refund: 0,
      unexpected_adjustment: 0,
      amount_mismatch: 0,
      multi_factor: 0
    };

    // Helper to format IDs (unique per batch to prevent duplicate key collisions)
    const batchSuffix = batchId === 'BATCH-FR-DEMO' ? '' : `-${batchId.slice(-6)}`;
    const getPayId = (idx: number) => `PAY${batchSuffix}-${String(idx).padStart(3, '0')}`;
    const getStlId = (idx: number) => `STL${batchSuffix}-${String(idx).padStart(3, '0')}`;
    const getRefId = (idx: number) => `REF${batchSuffix}-${String(idx).padStart(3, '0')}`;
    const getFeeId = (idx: number) => `FEE${batchSuffix}-${String(idx).padStart(3, '0')}`;
    const getAdjId = (idx: number) => `ADJ${batchSuffix}-${String(idx).padStart(3, '0')}`;
    const getUtr = (idx: number) => `UTR${batchSuffix}-${String(idx).padStart(6, '0')}`;

    // ----------------------------------------------------
    // 1. NORMAL MATCHED CASES: 35 records (PAY-001 to PAY-035)
    // ----------------------------------------------------
    for (let i = 0; i < 35; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[i % merchants.length];
      const method = methods[i % methods.length];
      const customerId = `CUST-${this.rng.nextInt(1001, 9999)}`;
      
      // Amount between ₹500 and ₹45,000
      const amountVal = (this.rng.nextInt(5, 450) * 100).toFixed(2);
      const amount = new Decimal(amountVal);
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const expectedSettlement = amount.minus(feeCalc.totalFee);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        metadata: { channel: 'web', simulated: true },
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId,
        createdAt: capturedAt
      });

      settlementsToInsert.push({
        settlementId: getStlId(currentSettlementIdx++),
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(feeCalc.gst),
        netAmount: toDecimal128(expectedSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId,
        createdAt: settledAt
      });

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(expectedSettlement),
        exceptionType: null,
        rootCause: null,
        supportingEvidenceIds: [paymentId, feesToInsert[feesToInsert.length - 1].feeId],
        correctDecision: 'matched',
        financialImpact: toDecimal128(new Decimal(0)),
        notes: 'Standard matched transaction without discrepancy',
        batchId
      });
    }

    // ----------------------------------------------------
    // 2. EXCEPTION CASES: 40 records (PAY-036 to PAY-075)
    // ----------------------------------------------------

    // Type 1: Fee mismatch (5 records)
    for (let i = 0; i < 5; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amountVal = (this.rng.nextInt(10, 200) * 100).toFixed(2);
      const amount = new Decimal(amountVal);
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const expectedSettlement = amount.minus(feeCalc.totalFee);

      // Skew fee by ₹0.50 to ₹15.00
      const feeDelta = new Decimal(this.rng.nextInt(1, 15) + 0.50);
      const actualBaseFee = feeCalc.baseFee.plus(feeDelta);
      const actualGst = feeCalc.gst;
      const actualTotalFee = actualBaseFee.plus(actualGst);
      const actualSettlement = amount.minus(actualTotalFee);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(actualBaseFee),
        gstOnFee: toDecimal128(actualGst),
        totalFee: toDecimal128(actualTotalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId,
        createdAt: capturedAt
      });

      settlementsToInsert.push({
        settlementId: getStlId(currentSettlementIdx++),
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(actualBaseFee),
        taxAmount: toDecimal128(actualGst),
        netAmount: toDecimal128(actualSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      const impact = actualSettlement.minus(expectedSettlement).abs();

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlement),
        exceptionType: 'fee_mismatch',
        rootCause: 'Incorrect base fee calculation rate or rounding skew in processing gateway',
        supportingEvidenceIds: [paymentId, feesToInsert[feesToInsert.length - 1].feeId],
        correctDecision: 'auto_resolve',
        financialImpact: toDecimal128(impact),
        notes: `Fee discrepancy of ₹${impact.toFixed(2)} is within safe auto-resolution boundary`,
        batchId
      });

      exceptionCounts.fee_mismatch++;
    }

    // Type 2: GST mismatch (4 records)
    for (let i = 0; i < 4; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(20, 250) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const expectedSettlement = amount.minus(feeCalc.totalFee);

      // Faulty GST: computed at 12% instead of 18%
      const wrongGst = feeCalc.baseFee.times(new Decimal('0.12'));
      const actualTotalFee = feeCalc.baseFee.plus(wrongGst);
      const actualSettlement = amount.minus(actualTotalFee);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(wrongGst),
        totalFee: toDecimal128(actualTotalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      settlementsToInsert.push({
        settlementId: getStlId(currentSettlementIdx++),
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(wrongGst),
        netAmount: toDecimal128(actualSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      const impact = actualSettlement.minus(expectedSettlement).abs();

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlement),
        exceptionType: 'gst_mismatch',
        rootCause: 'GST charged at 12% tax slab instead of standard 18% rate on financial services fee',
        supportingEvidenceIds: [paymentId, feesToInsert[feesToInsert.length - 1].feeId],
        correctDecision: 'auto_resolve',
        financialImpact: toDecimal128(impact),
        notes: 'Tax recalculation error requiring standard tax adjustment',
        batchId
      });

      exceptionCounts.gst_mismatch++;
    }

    // Type 3: Missing settlement (4 records)
    for (let i = 0; i < 4; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(15, 300) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const expectedSettlement = amount.minus(feeCalc.totalFee);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      // No Settlement record created!

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(new Decimal(0)),
        exceptionType: 'missing_settlement',
        rootCause: 'Payment captured successfully but settlement batch file not generated or dropped by bank clearing',
        supportingEvidenceIds: [paymentId],
        correctDecision: 'escalate',
        financialImpact: toDecimal128(expectedSettlement),
        notes: 'Settlement missing entirely; requires manual clearance or retry queue submission',
        batchId
      });

      exceptionCounts.missing_settlement++;
    }

    // Type 4: Duplicate settlement (3 records)
    for (let i = 0; i < 3; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(10, 180) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const expectedSettlement = amount.minus(feeCalc.totalFee);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      // First Settlement
      const stl1 = getStlId(currentSettlementIdx++);
      settlementsToInsert.push({
        settlementId: stl1,
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(feeCalc.gst),
        netAmount: toDecimal128(expectedSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      // Second Duplicate Settlement
      const stl2 = getStlId(currentSettlementIdx++);
      settlementsToInsert.push({
        settlementId: stl2,
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(feeCalc.gst),
        netAmount: toDecimal128(expectedSettlement),
        status: 'processed',
        settledAt: new Date(settledAt.getTime() + 3600 * 1000),
        utr: `${getUtr(pIdx)}-DUP`,
        batchId
      });

      const actualSettlementTotal = expectedSettlement.times(2);

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlementTotal),
        exceptionType: 'duplicate_settlement',
        rootCause: 'Duplicate settlement payout instruction processed twice with different UTRs',
        supportingEvidenceIds: [paymentId, stl1, stl2],
        correctDecision: 'escalate',
        financialImpact: toDecimal128(expectedSettlement),
        notes: 'Over-credit risk; requires payout reversal and bank reconciliation hold',
        batchId
      });

      exceptionCounts.duplicate_settlement++;
    }

    // Type 5: Partial settlement (4 records)
    for (let i = 0; i < 4; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(25, 200) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const expectedSettlement = amount.minus(feeCalc.totalFee);

      // Partial settlement: 75% of expected
      const partialRatio = new Decimal('0.75');
      const actualSettlement = expectedSettlement.times(partialRatio).toDecimalPlaces(2);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      const stlId = getStlId(currentSettlementIdx++);
      settlementsToInsert.push({
        settlementId: stlId,
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(feeCalc.gst),
        netAmount: toDecimal128(actualSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      const impact = expectedSettlement.minus(actualSettlement).abs();

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlement),
        exceptionType: 'partial_settlement',
        rootCause: 'Partial settlement release due to gateway tranche cutoff limits',
        supportingEvidenceIds: [paymentId, stlId],
        correctDecision: 'auto_resolve',
        financialImpact: toDecimal128(impact),
        notes: 'Pending tranche remainder scheduled for next cycle',
        batchId
      });

      exceptionCounts.partial_settlement++;
    }

    // Type 6: Refund not adjusted (4 records)
    for (let i = 0; i < 4; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(30, 150) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const refundAmount = amount.times(new Decimal('0.5')).toDecimalPlaces(2);
      const expectedSettlement = amount.minus(feeCalc.totalFee).minus(refundAmount);

      // Actual settlement did NOT deduct the refund!
      const actualSettlement = amount.minus(feeCalc.totalFee);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'refunded',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      const refId = getRefId(currentRefundIdx++);
      refundsToInsert.push({
        refundId: refId,
        paymentId,
        amount: toDecimal128(refundAmount),
        reason: 'Customer initiated order return',
        status: 'processed',
        processedAt: new Date(capturedAt.getTime() + 12 * 3600 * 1000),
        batchId
      });

      const stlId = getStlId(currentSettlementIdx++);
      settlementsToInsert.push({
        settlementId: stlId,
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(feeCalc.gst),
        netAmount: toDecimal128(actualSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      const impact = actualSettlement.minus(expectedSettlement).abs();

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlement),
        exceptionType: 'refund_not_adjusted',
        rootCause: 'Customer refund was processed after settlement batch compilation without clawback adjustment',
        supportingEvidenceIds: [paymentId, refId, stlId],
        correctDecision: 'auto_resolve',
        financialImpact: toDecimal128(impact),
        notes: 'Clawback adjustment can be scheduled in subsequent merchant settlement cycle',
        batchId
      });

      exceptionCounts.refund_not_adjusted++;
    }

    // Type 7: Duplicate refund (3 records)
    for (let i = 0; i < 3; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(20, 100) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const refundAmount = amount.times(new Decimal('0.4')).toDecimalPlaces(2);
      
      // Expected only has ONE refund
      const expectedSettlement = amount.minus(feeCalc.totalFee).minus(refundAmount);
      // Both refunds deducted from settlement
      const actualSettlement = amount.minus(feeCalc.totalFee).minus(refundAmount.times(2));

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'refunded',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      const ref1 = getRefId(currentRefundIdx++);
      refundsToInsert.push({
        refundId: ref1,
        paymentId,
        amount: toDecimal128(refundAmount),
        reason: 'Order cancellation item 1',
        status: 'processed',
        processedAt: new Date(capturedAt.getTime() + 8 * 3600 * 1000),
        batchId
      });

      const ref2 = getRefId(currentRefundIdx++);
      refundsToInsert.push({
        refundId: ref2,
        paymentId,
        amount: toDecimal128(refundAmount),
        reason: 'Order cancellation item 1 (duplicate hook call)',
        status: 'processed',
        processedAt: new Date(capturedAt.getTime() + 9 * 3600 * 1000),
        batchId
      });

      const stlId = getStlId(currentSettlementIdx++);
      settlementsToInsert.push({
        settlementId: stlId,
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(feeCalc.gst),
        netAmount: toDecimal128(actualSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlement),
        exceptionType: 'duplicate_refund',
        rootCause: 'Duplicate webhook event triggered twin refund executions for the same customer dispute',
        supportingEvidenceIds: [paymentId, ref1, ref2, stlId],
        correctDecision: 'escalate',
        financialImpact: toDecimal128(refundAmount),
        notes: 'Unwarranted double debit from merchant settlement pool requires manual ops reversal',
        batchId
      });

      exceptionCounts.duplicate_refund++;
    }

    // Type 8: Unexpected adjustment (3 records)
    for (let i = 0; i < 3; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(20, 150) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const adjAmount = new Decimal('350.00');
      const expectedSettlement = amount.minus(feeCalc.totalFee);
      const actualSettlement = expectedSettlement.minus(adjAmount);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      const adjId = getAdjId(currentAdjustmentIdx++);
      adjustmentsToInsert.push({
        adjustmentId: adjId,
        paymentId,
        merchantId,
        type: 'penalty',
        amount: toDecimal128(adjAmount),
        reason: 'Unspecified settlement penalty debit',
        batchId,
        createdAt: new Date(settledAt.getTime() - 2 * 3600 * 1000)
      });

      const stlId = getStlId(currentSettlementIdx++);
      settlementsToInsert.push({
        settlementId: stlId,
        paymentId,
        merchantId,
        grossAmount: toDecimal128(amount),
        feeAmount: toDecimal128(feeCalc.baseFee),
        taxAmount: toDecimal128(feeCalc.gst),
        netAmount: toDecimal128(actualSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlement),
        exceptionType: 'unexpected_adjustment',
        rootCause: 'Manual risk debit/penalty applied without an attached dispute or compliance ticket',
        supportingEvidenceIds: [paymentId, adjId, stlId],
        correctDecision: 'escalate',
        financialImpact: toDecimal128(adjAmount),
        notes: 'Compliance risk review required to validate arbitrary fee/penalty adjustment',
        batchId
      });

      exceptionCounts.unexpected_adjustment++;
    }

    // Type 9: Amount mismatch (4 records)
    for (let i = 0; i < 4; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(30, 200) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const expectedSettlement = amount.minus(feeCalc.totalFee);

      // Gross amount discrepancy of ₹50 to ₹200
      const grossSkew = new Decimal(50 * (i + 1));
      const actualGross = amount.minus(grossSkew);
      const actualFeeCalc = FinanceEngine.calculateFee(actualGross, method);
      const actualSettlement = actualGross.minus(actualFeeCalc.totalFee);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      feesToInsert.push({
        feeId: getFeeId(currentFeeIdx++),
        paymentId,
        baseFee: toDecimal128(feeCalc.baseFee),
        gstOnFee: toDecimal128(feeCalc.gst),
        totalFee: toDecimal128(feeCalc.totalFee),
        method,
        rateApplied: toDecimal128(feeCalc.rateApplied),
        batchId
      });

      const stlId = getStlId(currentSettlementIdx++);
      settlementsToInsert.push({
        settlementId: stlId,
        paymentId,
        merchantId,
        grossAmount: toDecimal128(actualGross),
        feeAmount: toDecimal128(actualFeeCalc.baseFee),
        taxAmount: toDecimal128(actualFeeCalc.gst),
        netAmount: toDecimal128(actualSettlement),
        status: 'processed',
        settledAt,
        utr: getUtr(pIdx),
        batchId
      });

      const impact = expectedSettlement.minus(actualSettlement).abs();

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedSettlement),
        actualSettlement: toDecimal128(actualSettlement),
        exceptionType: 'amount_mismatch',
        rootCause: 'Data entry or currency truncation error between payment authorization and batch gross capture',
        supportingEvidenceIds: [paymentId, stlId],
        correctDecision: 'auto_resolve',
        financialImpact: toDecimal128(impact),
        notes: 'Discrepancy within auto-resolution thresholds',
        batchId
      });

      exceptionCounts.amount_mismatch++;
    }

    // Type 10: Multi-factor / Ambiguous (6 records)
    // 3 auto-resolvable multi-factor cases, 3 genuinely ambiguous ESCALATE cases
    for (let i = 0; i < 6; i++) {
      const pIdx = currentPaymentIdx++;
      const paymentId = getPayId(pIdx);
      const merchantId = merchants[(pIdx + i) % merchants.length];
      const method = methods[i % methods.length];
      const amount = new Decimal((this.rng.nextInt(40, 300) * 100).toFixed(2));
      const capturedAt = this.rng.nextDate(baseDate, endDate);
      const settledAt = new Date(capturedAt.getTime() + 24 * 3600 * 1000);

      const feeCalc = FinanceEngine.calculateFee(amount, method);
      const isAmbiguous = i >= 3; // First 3 are resolved multi-factor, last 3 are ambiguous ESCALATE

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId: `CUST-${this.rng.nextInt(1001, 9999)}`,
        amount: toDecimal128(amount),
        currency: 'INR',
        method,
        status: 'captured',
        capturedAt,
        batchId
      });

      const feeId = getFeeId(currentFeeIdx++);
      const refId = getRefId(currentRefundIdx++);
      const adjId = getAdjId(currentAdjustmentIdx++);
      const stlId = getStlId(currentSettlementIdx++);

      if (!isAmbiguous) {
        // Multi-factor solvable: small fee skew + partial refund not adjusted
        const refundAmt = new Decimal('200.00');
        const feeSkew = new Decimal('5.00');
        const actualBaseFee = feeCalc.baseFee.plus(feeSkew);
        const actualTotalFee = actualBaseFee.plus(feeCalc.gst);
        const expectedSettlement = amount.minus(feeCalc.totalFee).minus(refundAmt);
        const actualSettlement = amount.minus(actualTotalFee); // missing refund deduction + fee skew

        feesToInsert.push({
          feeId,
          paymentId,
          baseFee: toDecimal128(actualBaseFee),
          gstOnFee: toDecimal128(feeCalc.gst),
          totalFee: toDecimal128(actualTotalFee),
          method,
          rateApplied: toDecimal128(feeCalc.rateApplied),
          batchId
        });

        refundsToInsert.push({
          refundId: refId,
          paymentId,
          amount: toDecimal128(refundAmt),
          reason: 'Partial customer refund',
          status: 'processed',
          processedAt: new Date(capturedAt.getTime() + 10 * 3600 * 1000),
          batchId
        });

        settlementsToInsert.push({
          settlementId: stlId,
          paymentId,
          merchantId,
          grossAmount: toDecimal128(amount),
          feeAmount: toDecimal128(actualBaseFee),
          taxAmount: toDecimal128(feeCalc.gst),
          netAmount: toDecimal128(actualSettlement),
          status: 'processed',
          settledAt,
          utr: getUtr(pIdx),
          batchId
        });

        const impact = actualSettlement.minus(expectedSettlement).abs();

        groundTruthsToInsert.push({
          paymentId,
          expectedSettlement: toDecimal128(expectedSettlement),
          actualSettlement: toDecimal128(actualSettlement),
          exceptionType: 'multi_factor',
          rootCause: 'Compound issue: minor fee calculation rate mismatch combined with unadjusted partial refund',
          supportingEvidenceIds: [paymentId, feeId, refId, stlId],
          correctDecision: 'escalate', // Multi-factor is not in default allowed auto-resolve types or requires escalation
          financialImpact: toDecimal128(impact),
          notes: 'Multi-factor compound discrepancy requires supervisor validation',
          batchId
        });
      } else {
        // Genuinely ambiguous: contradictory records, unexplained adjustments, missing logs
        const arbitraryDeduction = new Decimal('1250.00');
        const expectedSettlement = amount.minus(feeCalc.totalFee);
        const actualSettlement = expectedSettlement.minus(arbitraryDeduction);

        feesToInsert.push({
          feeId,
          paymentId,
          baseFee: toDecimal128(feeCalc.baseFee),
          gstOnFee: toDecimal128(feeCalc.gst),
          totalFee: toDecimal128(feeCalc.totalFee),
          method,
          rateApplied: toDecimal128(feeCalc.rateApplied),
          batchId
        });

        adjustmentsToInsert.push({
          adjustmentId: adjId,
          paymentId,
          merchantId,
          type: 'chargeback',
          amount: toDecimal128(arbitraryDeduction),
          reason: 'Conflicting chargeback ticket #9812 with no matching dispute document',
          batchId,
          createdAt: capturedAt
        });

        settlementsToInsert.push({
          settlementId: stlId,
          paymentId,
          merchantId,
          grossAmount: toDecimal128(amount),
          feeAmount: toDecimal128(feeCalc.baseFee),
          taxAmount: toDecimal128(feeCalc.gst),
          netAmount: toDecimal128(actualSettlement),
          status: 'processed',
          settledAt,
          utr: getUtr(pIdx),
          batchId
        });

        groundTruthsToInsert.push({
          paymentId,
          expectedSettlement: toDecimal128(expectedSettlement),
          actualSettlement: toDecimal128(actualSettlement),
          exceptionType: 'multi_factor',
          rootCause: 'Genuinely ambiguous dispute: contradictory chargeback record with incomplete audit trail',
          supportingEvidenceIds: [paymentId, feeId, adjId, stlId],
          correctDecision: 'escalate',
          financialImpact: toDecimal128(arbitraryDeduction),
          notes: 'Evidence is insufficient/conflicting; deterministic policy gate MUST escalate',
          batchId
        });
      }

      exceptionCounts.multi_factor++;
    }

    // 3. Batch bulk insert to MongoDB
    await Promise.all([
      Payment.insertMany(paymentsToInsert),
      Settlement.insertMany(settlementsToInsert),
      Refund.insertMany(refundsToInsert),
      Fee.insertMany(feesToInsert),
      Adjustment.insertMany(adjustmentsToInsert),
      GroundTruth.insertMany(groundTruthsToInsert)
    ]);

    const totalRecords = paymentsToInsert.length;
    const exceptionRecords = Object.values(exceptionCounts).reduce((a, b) => a + b, 0);
    const matchedRecords = totalRecords - exceptionRecords;

    return {
      batchId,
      seed,
      totalRecords,
      matchedRecords,
      exceptionRecords,
      exceptionsByType: exceptionCounts,
      generatedAt: new Date().toISOString()
    };
  }
}

export const dataGenerator = new DataGenerator(42);
