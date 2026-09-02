// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing

import { Decimal, toDecimal, toDecimal128 } from '../utils/decimal';
import { RECONCILIATION_TOLERANCE } from '../config/financeRules';
import { FinanceEngine } from './financeEngine';
import {
  Payment,
  Settlement,
  Refund,
  Fee,
  Adjustment,
  Exception,
  ExceptionType,
  ExceptionSeverity
} from '../models';

export interface ReconciliationItemResult {
  paymentId: string;
  status: 'matched' | 'exception';
  exceptionType?: ExceptionType;
  severity?: ExceptionSeverity;
  expectedAmount: Decimal;
  actualAmount: Decimal;
  discrepancy: Decimal;
  details: string;
}

export interface ReconciliationSummary {
  batchId: string;
  totalProcessed: number;
  matchedCount: number;
  exceptionCount: number;
  byType: Record<string, number>;
  reconciledAt: string;
}

export class ReconciliationEngine {
  private tolerance: Decimal;

  constructor() {
    this.tolerance = new Decimal(RECONCILIATION_TOLERANCE);
  }

  public async reconcileBatch(batchId: string): Promise<{
    summary: ReconciliationSummary;
    items: ReconciliationItemResult[];
  }> {
    // Clear old exceptions for this batch
    await Exception.deleteMany({ batchId });

    // Fetch all related entities in batch
    const [payments, settlements, refunds, fees, adjustments] = await Promise.all([
      Payment.find({ batchId }),
      Settlement.find({ batchId }),
      Refund.find({ batchId }),
      Fee.find({ batchId }),
      Adjustment.find({ batchId })
    ]);

    // Group by paymentId
    const settlementsByPayment = new Map<string, typeof settlements>();
    for (const s of settlements) {
      const arr = settlementsByPayment.get(s.paymentId) || [];
      arr.push(s);
      settlementsByPayment.set(s.paymentId, arr);
    }

    const refundsByPayment = new Map<string, typeof refunds>();
    for (const r of refunds) {
      const arr = refundsByPayment.get(r.paymentId) || [];
      arr.push(r);
      refundsByPayment.set(r.paymentId, arr);
    }

    const feesByPayment = new Map<string, typeof fees>();
    for (const f of fees) {
      const arr = feesByPayment.get(f.paymentId) || [];
      arr.push(f);
      feesByPayment.set(f.paymentId, arr);
    }

    const adjustmentsByPayment = new Map<string, typeof adjustments>();
    for (const a of adjustments) {
      if (a.paymentId) {
        const arr = adjustmentsByPayment.get(a.paymentId) || [];
        arr.push(a);
        adjustmentsByPayment.set(a.paymentId, arr);
      }
    }

    const items: ReconciliationItemResult[] = [];
    const exceptionsToSave: any[] = [];
    let currentExceptionIdx = 1;
    // Derive batch suffix for unique exception IDs (e.g. BATCH-FR-DEMO → FR-DEMO)
    const batchSuffix = batchId.replace(/^BATCH-/i, '');

    const byTypeCounts: Record<string, number> = {
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

    for (const payment of payments) {
      const payId = payment.paymentId;
      const paymentAmount = toDecimal(payment.amount);
      const stlList = settlementsByPayment.get(payId) || [];
      const refList = refundsByPayment.get(payId) || [];
      const feeList = feesByPayment.get(payId) || [];
      const adjList = adjustmentsByPayment.get(payId) || [];

      // Calculate theoretical standard fee & expected settlement
      const feeCalc = FinanceEngine.calculateFee(paymentAmount, payment.method);
      const expectedCalc = FinanceEngine.calculateExpectedSettlement(
        paymentAmount,
        feeCalc.baseFee,
        feeCalc.gst,
        refList.map((r) => ({ amount: toDecimal(r.amount) })),
        adjList.map((a) => ({ amount: toDecimal(a.amount), type: a.type }))
      );
      const expectedNetAmount = expectedCalc.expectedNetAmount;

      // Anomaly Detection Checks

      // 1. Missing settlement
      if (stlList.length === 0) {
        const discrepancy = new Decimal(0).minus(expectedNetAmount);
        const item: ReconciliationItemResult = {
          paymentId: payId,
          status: 'exception',
          exceptionType: 'missing_settlement',
          severity: 'high',
          expectedAmount: expectedNetAmount,
          actualAmount: new Decimal(0),
          discrepancy,
          details: 'Captured payment has no corresponding settlement record in clearing file'
        };
        items.push(item);
        byTypeCounts.missing_settlement++;
        exceptionsToSave.push({
          exceptionId: `EXP-${batchSuffix}-${String(currentExceptionIdx++).padStart(3, '0')}`,
          paymentId: payId,
          settlementId: null,
          type: 'missing_settlement',
          severity: 'high',
          expectedAmount: toDecimal128(expectedNetAmount),
          actualAmount: toDecimal128(new Decimal(0)),
          discrepancy: toDecimal128(discrepancy),
          status: 'detected',
          batchId
        });
        continue;
      }

      // 2. Duplicate settlement
      if (stlList.length > 1) {
        const totalActualSettled = stlList.reduce(
          (acc, s) => acc.plus(toDecimal(s.netAmount)),
          new Decimal(0)
        );
        const discrepancy = totalActualSettled.minus(expectedNetAmount);
        const item: ReconciliationItemResult = {
          paymentId: payId,
          status: 'exception',
          exceptionType: 'duplicate_settlement',
          severity: 'critical',
          expectedAmount: expectedNetAmount,
          actualAmount: totalActualSettled,
          discrepancy,
          details: `Detected ${stlList.length} duplicate settlement payout records for single payment`
        };
        items.push(item);
        byTypeCounts.duplicate_settlement++;
        exceptionsToSave.push({
          exceptionId: `EXP-${batchSuffix}-${String(currentExceptionIdx++).padStart(3, '0')}`,
          paymentId: payId,
          settlementId: stlList[0].settlementId,
          type: 'duplicate_settlement',
          severity: 'critical',
          expectedAmount: toDecimal128(expectedNetAmount),
          actualAmount: toDecimal128(totalActualSettled),
          discrepancy: toDecimal128(discrepancy),
          status: 'detected',
          batchId
        });
        continue;
      }

      const settlement = stlList[0];
      const actualGross = toDecimal(settlement.grossAmount);
      const actualBaseFee = toDecimal(settlement.feeAmount);
      const actualTax = toDecimal(settlement.taxAmount);
      const actualNetAmount = toDecimal(settlement.netAmount);
      const discrepancy = actualNetAmount.minus(expectedNetAmount);

      // 3. Duplicate refund check
      if (refList.length > 1) {
        const item: ReconciliationItemResult = {
          paymentId: payId,
          status: 'exception',
          exceptionType: 'duplicate_refund',
          severity: 'high',
          expectedAmount: expectedNetAmount,
          actualAmount: actualNetAmount,
          discrepancy,
          details: `Payment has ${refList.length} refund records with identical or conflicting reasons`
        };
        items.push(item);
        byTypeCounts.duplicate_refund++;
        exceptionsToSave.push({
          exceptionId: `EXP-${batchSuffix}-${String(currentExceptionIdx++).padStart(3, '0')}`,
          paymentId: payId,
          settlementId: settlement.settlementId,
          type: 'duplicate_refund',
          severity: 'high',
          expectedAmount: toDecimal128(expectedNetAmount),
          actualAmount: toDecimal128(actualNetAmount),
          discrepancy: toDecimal128(discrepancy),
          status: 'detected',
          batchId
        });
        continue;
      }

      // 4. Unexpected adjustment
      if (adjList.length > 0) {
        // Check if this adjustment is an unexpected penalty or unexplained debit
        const hasUnexplainedAdj = adjList.some(
          (a) => a.reason.toLowerCase().includes('unspecified') || a.reason.toLowerCase().includes('conflicting')
        );
        if (hasUnexplainedAdj) {
          const itemType: ExceptionType = adjList.some((a) =>
            a.reason.toLowerCase().includes('conflicting')
          )
            ? 'multi_factor'
            : 'unexpected_adjustment';

          const item: ReconciliationItemResult = {
            paymentId: payId,
            status: 'exception',
            exceptionType: itemType,
            severity: itemType === 'multi_factor' ? 'critical' : 'medium',
            expectedAmount: expectedNetAmount,
            actualAmount: actualNetAmount,
            discrepancy,
            details: `Unexplained adjustment ticket (${adjList[0].adjustmentId}) attached to payment`
          };
          items.push(item);
          byTypeCounts[itemType]++;
          exceptionsToSave.push({
            exceptionId: `EXP-${batchSuffix}-${String(currentExceptionIdx++).padStart(3, '0')}`,
            paymentId: payId,
            settlementId: settlement.settlementId,
            type: itemType,
            severity: itemType === 'multi_factor' ? 'critical' : 'medium',
            expectedAmount: toDecimal128(expectedNetAmount),
            actualAmount: toDecimal128(actualNetAmount),
            discrepancy: toDecimal128(discrepancy),
            status: 'detected',
            batchId
          });
          continue;
        }
      }

      // 5. Refund not adjusted check
      if (refList.length === 1) {
        const refundAmt = toDecimal(refList[0].amount);
        // If settlement net amount equals gross - fee without refund deducted
        const settlementWithoutRefund = paymentAmount.minus(feeCalc.totalFee);
        if (
          actualNetAmount.minus(settlementWithoutRefund).abs().lte(this.tolerance) &&
          refundAmt.gt(0)
        ) {
          const item: ReconciliationItemResult = {
            paymentId: payId,
            status: 'exception',
            exceptionType: 'refund_not_adjusted',
            severity: 'medium',
            expectedAmount: expectedNetAmount,
            actualAmount: actualNetAmount,
            discrepancy,
            details: `Processed refund of ${refundAmt.toFixed(2)} was not deducted from merchant settlement`
          };
          items.push(item);
          byTypeCounts.refund_not_adjusted++;
          exceptionsToSave.push({
            exceptionId: `EXP-${batchSuffix}-${String(currentExceptionIdx++).padStart(3, '0')}`,
            paymentId: payId,
            settlementId: settlement.settlementId,
            type: 'refund_not_adjusted',
            severity: 'medium',
            expectedAmount: toDecimal128(expectedNetAmount),
            actualAmount: toDecimal128(actualNetAmount),
            discrepancy: toDecimal128(discrepancy),
            status: 'detected',
            batchId
          });
          continue;
        }
      }

      // 6. Gross Amount Mismatch
      if (actualGross.minus(paymentAmount).abs().gt(this.tolerance)) {
        const item: ReconciliationItemResult = {
          paymentId: payId,
          status: 'exception',
          exceptionType: 'amount_mismatch',
          severity: 'medium',
          expectedAmount: expectedNetAmount,
          actualAmount: actualNetAmount,
          discrepancy,
          details: `Settlement gross amount (${actualGross.toFixed(2)}) does not match captured payment amount (${paymentAmount.toFixed(2)})`
        };
        items.push(item);
        byTypeCounts.amount_mismatch++;
        exceptionsToSave.push({
          exceptionId: `EXP-${batchSuffix}-${String(currentExceptionIdx++).padStart(3, '0')}`,
          paymentId: payId,
          settlementId: settlement.settlementId,
          type: 'amount_mismatch',
          severity: 'medium',
          expectedAmount: toDecimal128(expectedNetAmount),
          actualAmount: toDecimal128(actualNetAmount),
          discrepancy: toDecimal128(discrepancy),
          status: 'detected',
          batchId
        });
        continue;
      }

      // 7. Fee / GST / Partial / Multi-factor discrepancy
      if (discrepancy.abs().gt(this.tolerance)) {
        let identifiedType: ExceptionType = 'fee_mismatch';
        let severity: ExceptionSeverity = 'medium';

        // Check if base fee matches but GST is wrong (e.g. 12% vs 18%)
        if (
          actualBaseFee.minus(feeCalc.baseFee).abs().lte(this.tolerance) &&
          actualTax.minus(feeCalc.gst).abs().gt(this.tolerance)
        ) {
          identifiedType = 'gst_mismatch';
          severity = 'low';
        } else if (
          actualBaseFee.minus(feeCalc.baseFee).abs().gt(this.tolerance) &&
          refList.length > 0
        ) {
          identifiedType = 'multi_factor';
          severity = 'high';
        } else if (
          actualNetAmount.lt(expectedNetAmount.times(new Decimal('0.90'))) &&
          actualBaseFee.minus(feeCalc.baseFee).abs().lte(this.tolerance)
        ) {
          identifiedType = 'partial_settlement';
          severity = 'medium';
        } else if (actualBaseFee.minus(feeCalc.baseFee).abs().gt(this.tolerance)) {
          identifiedType = 'fee_mismatch';
          severity = 'low';
        } else {
          identifiedType = 'amount_mismatch';
          severity = 'medium';
        }

        const item: ReconciliationItemResult = {
          paymentId: payId,
          status: 'exception',
          exceptionType: identifiedType,
          severity,
          expectedAmount: expectedNetAmount,
          actualAmount: actualNetAmount,
          discrepancy,
          details: `Net settlement variance of ${discrepancy.toFixed(2)} detected against expected amount`
        };
        items.push(item);
        byTypeCounts[identifiedType]++;
        exceptionsToSave.push({
          exceptionId: `EXP-${batchSuffix}-${String(currentExceptionIdx++).padStart(3, '0')}`,
          paymentId: payId,
          settlementId: settlement.settlementId,
          type: identifiedType,
          severity,
          expectedAmount: toDecimal128(expectedNetAmount),
          actualAmount: toDecimal128(actualNetAmount),
          discrepancy: toDecimal128(discrepancy),
          status: 'detected',
          batchId
        });
        continue;
      }

      // 8. Otherwise: MATCHED
      items.push({
        paymentId: payId,
        status: 'matched',
        expectedAmount: expectedNetAmount,
        actualAmount: actualNetAmount,
        discrepancy: new Decimal(0),
        details: 'Payment and settlement match perfectly within currency tolerance'
      });
    }

    // Save all exceptions to MongoDB
    if (exceptionsToSave.length > 0) {
      await Exception.insertMany(exceptionsToSave);
    }

    const matchedCount = items.filter((i) => i.status === 'matched').length;
    const exceptionCount = items.filter((i) => i.status === 'exception').length;

    return {
      summary: {
        batchId,
        totalProcessed: payments.length,
        matchedCount,
        exceptionCount,
        byType: byTypeCounts,
        reconciledAt: new Date().toISOString()
      },
      items
    };
  }
}

export const reconciliationEngine = new ReconciliationEngine();
