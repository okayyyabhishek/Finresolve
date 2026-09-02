// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing

import { Decimal, toDecimal } from '../utils/decimal';
import { FEE_RATES, GST_RATE } from '../config/financeRules';

export interface FeeCalculationResult {
  baseFee: Decimal;
  gst: Decimal;
  totalFee: Decimal;
  rateApplied: Decimal;
}

export interface ExpectedSettlementBreakdown {
  paymentAmount: Decimal;
  baseFee: Decimal;
  gst: Decimal;
  totalFee: Decimal;
  totalRefunds: Decimal;
  totalAdjustments: Decimal;
}

export interface ExpectedSettlementResult {
  expectedNetAmount: Decimal;
  breakdown: ExpectedSettlementBreakdown;
}

export interface DiscrepancyResult {
  discrepancy: Decimal;
  percentage: Decimal;
  direction: 'excess' | 'shortfall' | 'matched';
}

export class FinanceEngine {
  /**
   * Calculates deterministic fee, GST, and total fee for a given payment method and amount.
   * // SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
   */
  public static calculateFee(
    amountInput: Decimal | string | number,
    method: string
  ): FeeCalculationResult {
    const amount = toDecimal(amountInput);
    const rateStr = FEE_RATES[method.toLowerCase()] || FEE_RATES['card'];
    const rateApplied = new Decimal(rateStr);
    const gstRate = new Decimal(GST_RATE);

    // baseFee = amount * rateApplied
    const baseFee = amount.times(rateApplied);
    // gst = baseFee * 0.18
    const gst = baseFee.times(gstRate);
    // totalFee = baseFee + gst
    const totalFee = baseFee.plus(gst);

    return {
      baseFee,
      gst,
      totalFee,
      rateApplied
    };
  }

  /**
   * Computes the net expected settlement amount considering base fee, GST, refunds, and adjustments.
   * Formula: Net Expected = Payment Amount - (Base Fee + GST) - Total Refunds - Net Deductible Adjustments
   */
  public static calculateExpectedSettlement(
    paymentAmountInput: Decimal | string | number,
    feeInput: Decimal | string | number,
    gstInput: Decimal | string | number,
    refunds: Array<{ amount: Decimal | string | number }> = [],
    adjustments: Array<{
      amount: Decimal | string | number;
      type: 'chargeback' | 'reversal' | 'correction' | 'penalty' | string;
    }> = []
  ): ExpectedSettlementResult {
    const paymentAmount = toDecimal(paymentAmountInput);
    const baseFee = toDecimal(feeInput);
    const gst = toDecimal(gstInput);
    const totalFee = baseFee.plus(gst);

    // Sum all refunds
    let totalRefunds = new Decimal(0);
    for (const r of refunds) {
      totalRefunds = totalRefunds.plus(toDecimal(r.amount));
    }

    // Sum all adjustments (chargebacks/reversals/penalties decrease settlement amount, positive corrections may adjust)
    let totalAdjustments = new Decimal(0);
    for (const adj of adjustments) {
      const adjAmount = toDecimal(adj.amount);
      if (adj.type === 'correction' && adjAmount.isNegative()) {
        totalAdjustments = totalAdjustments.plus(adjAmount.abs());
      } else {
        totalAdjustments = totalAdjustments.plus(adjAmount);
      }
    }

    // Net expected settlement = Payment - Fee - GST - Refunds - Adjustments
    const expectedNetAmount = paymentAmount
      .minus(totalFee)
      .minus(totalRefunds)
      .minus(totalAdjustments);

    return {
      expectedNetAmount,
      breakdown: {
        paymentAmount,
        baseFee,
        gst,
        totalFee,
        totalRefunds,
        totalAdjustments
      }
    };
  }

  /**
   * Computes the exact discrepancy and percentage difference between expected and actual settlement.
   * Discrepancy = Actual - Expected.
   */
  public static calculateDiscrepancy(
    expectedInput: Decimal | string | number,
    actualInput: Decimal | string | number,
    toleranceInput: Decimal | string | number = '0.01'
  ): DiscrepancyResult {
    const expected = toDecimal(expectedInput);
    const actual = toDecimal(actualInput);
    const discrepancy = actual.minus(expected);
    const tolerance = toDecimal(toleranceInput);

    let percentage = new Decimal(0);
    if (!expected.isZero()) {
      percentage = discrepancy.dividedBy(expected.abs()).times(100);
    }

    let direction: 'excess' | 'shortfall' | 'matched' = 'matched';
    if (discrepancy.abs().lte(tolerance)) {
      direction = 'matched';
    } else if (discrepancy.isPositive()) {
      direction = 'excess';
    } else if (discrepancy.isNegative()) {
      direction = 'shortfall';
    }

    return {
      discrepancy,
      percentage,
      direction
    };
  }

  /**
   * Calculates absolute financial impact (exposure) for a given exception or discrepancy.
   */
  public static calculateFinancialImpact(
    discrepancyInput: Decimal | string | number | { discrepancy: Decimal | string | number }
  ): Decimal {
    if (
      discrepancyInput &&
      typeof discrepancyInput === 'object' &&
      'discrepancy' in discrepancyInput
    ) {
      return toDecimal(discrepancyInput.discrepancy).abs();
    }
    return toDecimal(discrepancyInput as any).abs();
  }
}
