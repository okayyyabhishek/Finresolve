import { Decimal, toDecimal, serializeDecimals } from '../utils/decimal';
import { FinanceEngine } from './financeEngine';
import {
  Payment,
  Settlement,
  Refund,
  Fee,
  Adjustment
} from '../models';

export interface AgentToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, any>;
    required: string[];
  };
}

export const AGENT_TOOL_DECLARATIONS: AgentToolDeclaration[] = [
  {
    name: 'retrieve_payment_details',
    description: 'Retrieves the core payment record and associated settlement clearing record by payment ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paymentId: {
          type: 'STRING',
          description: 'Unique identifier of the payment (e.g. PAY-001)'
        }
      },
      required: ['paymentId']
    }
  },
  {
    name: 'retrieve_related_records',
    description: 'Retrieves all related ancillary records including merchant fees, customer refunds, and risk adjustments for a payment.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paymentId: {
          type: 'STRING',
          description: 'Unique identifier of the payment'
        }
      },
      required: ['paymentId']
    }
  },
  {
    name: 'calculate_expected_settlement',
    description: 'Executes the deterministic finance engine calculation for expected settlement net amount and returns complete breakdown.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paymentId: {
          type: 'STRING',
          description: 'Unique identifier of the payment to calculate expected settlement for'
        }
      },
      required: ['paymentId']
    }
  },
  {
    name: 'compare_financial_states',
    description: 'Compares expected vs actual financial amounts, calculating discrepancy, percentage variance, and detected anomalies.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paymentId: {
          type: 'STRING',
          description: 'Unique identifier of the payment to compare financial states for'
        }
      },
      required: ['paymentId']
    }
  },
  {
    name: 'inspect_transaction_history',
    description: 'Retrieves recent transactions for the same merchant to inspect error patterns, volume trends, or systemic failure signatures.',
    parameters: {
      type: 'OBJECT',
      properties: {
        merchantId: {
          type: 'STRING',
          description: 'Merchant identifier (e.g. MER-001)'
        },
        limit: {
          type: 'INTEGER',
          description: 'Number of recent records to retrieve (default 5, max 20)'
        }
      },
      required: ['merchantId']
    }
  },
  {
    name: 'search_duplicates',
    description: 'Searches across settlements, refunds, and adjustments for potential duplicates, identical UTRs, or twin webhook events.',
    parameters: {
      type: 'OBJECT',
      properties: {
        paymentId: {
          type: 'STRING',
          description: 'Payment ID to search duplicate candidates for'
        }
      },
      required: ['paymentId']
    }
  }
];

export class AgentToolsService {
  /**
   * 1. retrieve_payment_details(paymentId)
   */
  public static async retrievePaymentDetails(paymentId: string): Promise<any> {
    const payment = await Payment.findOne({ paymentId }).lean();
    const settlements = await Settlement.find({ paymentId }).lean();

    if (!payment) {
      return { found: false, message: `Payment with ID ${paymentId} not found` };
    }

    return serializeDecimals({
      found: true,
      payment,
      settlements,
      settlementCount: settlements.length
    });
  }

  /**
   * 2. retrieve_related_records(paymentId)
   */
  public static async retrieveRelatedRecords(paymentId: string): Promise<any> {
    const [fees, refunds, adjustments] = await Promise.all([
      Fee.find({ paymentId }).lean(),
      Refund.find({ paymentId }).lean(),
      Adjustment.find({ paymentId }).lean()
    ]);

    return serializeDecimals({
      paymentId,
      fees,
      refunds,
      adjustments,
      counts: {
        fees: fees.length,
        refunds: refunds.length,
        adjustments: adjustments.length
      }
    });
  }

  /**
   * 3. calculate_expected_settlement(paymentId)
   */
  public static async calculateExpectedSettlement(paymentId: string): Promise<any> {
    const payment = await Payment.findOne({ paymentId }).lean();
    if (!payment) {
      return { error: `Payment ${paymentId} not found` };
    }

    const [fees, refunds, adjustments] = await Promise.all([
      Fee.find({ paymentId }).lean(),
      Refund.find({ paymentId }).lean(),
      Adjustment.find({ paymentId }).lean()
    ]);

    const paymentAmount = toDecimal(payment.amount);
    const standardFeeCalc = FinanceEngine.calculateFee(paymentAmount, payment.method);

    const calcResult = FinanceEngine.calculateExpectedSettlement(
      paymentAmount,
      standardFeeCalc.baseFee,
      standardFeeCalc.gst,
      refunds.map((r) => ({ amount: toDecimal(r.amount) })),
      adjustments.map((a) => ({ amount: toDecimal(a.amount), type: a.type }))
    );

    return serializeDecimals({
      paymentId,
      paymentAmount: paymentAmount.toFixed(2),
      standardFeeCalculation: {
        method: payment.method,
        rateApplied: standardFeeCalc.rateApplied.toFixed(4),
        baseFee: standardFeeCalc.baseFee.toFixed(2),
        gst: standardFeeCalc.gst.toFixed(2),
        totalFee: standardFeeCalc.totalFee.toFixed(2)
      },
      actualRecordedFee: fees.length > 0 ? serializeDecimals(fees[0]) : null,
      expectedNetAmount: calcResult.expectedNetAmount.toFixed(2),
      breakdown: {
        paymentAmount: calcResult.breakdown.paymentAmount.toFixed(2),
        baseFee: calcResult.breakdown.baseFee.toFixed(2),
        gst: calcResult.breakdown.gst.toFixed(2),
        totalFee: calcResult.breakdown.totalFee.toFixed(2),
        totalRefunds: calcResult.breakdown.totalRefunds.toFixed(2),
        totalAdjustments: calcResult.breakdown.totalAdjustments.toFixed(2)
      }
    });
  }

  /**
   * 4. compare_financial_states(paymentId)
   */
  public static async compareFinancialStates(paymentId: string): Promise<any> {
    const expectedData = await this.calculateExpectedSettlement(paymentId);
    if (expectedData.error) {
      return expectedData;
    }

    const settlements = await Settlement.find({ paymentId }).lean();
    let actualNetAmount = new Decimal(0);
    let actualGrossAmount = new Decimal(0);
    let actualFeeAmount = new Decimal(0);
    let actualTaxAmount = new Decimal(0);

    for (const s of settlements) {
      actualNetAmount = actualNetAmount.plus(toDecimal(s.netAmount));
      actualGrossAmount = actualGrossAmount.plus(toDecimal(s.grossAmount));
      actualFeeAmount = actualFeeAmount.plus(toDecimal(s.feeAmount));
      actualTaxAmount = actualTaxAmount.plus(toDecimal(s.taxAmount));
    }

    const expectedNetAmount = toDecimal(expectedData.expectedNetAmount);
    const disc = FinanceEngine.calculateDiscrepancy(expectedNetAmount, actualNetAmount);

    const anomalies: string[] = [];
    if (settlements.length === 0) anomalies.push('MISSING_SETTLEMENT_RECORD');
    if (settlements.length > 1) anomalies.push(`MULTIPLE_SETTLEMENT_RECORDS_COUNT_${settlements.length}`);
    if (disc.discrepancy.abs().gt(0.01)) {
      anomalies.push(`SETTLEMENT_NET_DISCREPANCY_${disc.direction.toUpperCase()}_₹${disc.discrepancy.abs().toFixed(2)}`);
    }

    return serializeDecimals({
      paymentId,
      expectedNetAmount: expectedNetAmount.toFixed(2),
      actualNetAmount: actualNetAmount.toFixed(2),
      discrepancy: disc.discrepancy.toFixed(2),
      variancePercentage: `${disc.percentage.toFixed(2)}%`,
      direction: disc.direction,
      anomalies,
      breakdown: expectedData.breakdown
    });
  }

  /**
   * 5. inspect_transaction_history(merchantId, limit)
   */
  public static async inspectTransactionHistory(merchantId: string, limit: number = 5): Promise<any> {
    const cappedLimit = Math.min(Math.max(1, limit || 5), 20);
    const payments = await Payment.find({ merchantId })
      .sort({ capturedAt: -1 })
      .limit(cappedLimit)
      .lean();

    const paymentIds = payments.map((p) => p.paymentId);
    const settlements = await Settlement.find({ paymentId: { $in: paymentIds } }).lean();

    return serializeDecimals({
      merchantId,
      recentPaymentsCount: payments.length,
      payments,
      settlements
    });
  }

  /**
   * 6. search_duplicates(paymentId)
   */
  public static async searchDuplicates(paymentId: string): Promise<any> {
    const payment = await Payment.findOne({ paymentId }).lean();
    if (!payment) {
      return { error: `Payment ${paymentId} not found` };
    }

    const [duplicateSettlements, duplicateRefunds, similarPayments] = await Promise.all([
      Settlement.find({ paymentId }).lean(),
      Refund.find({ paymentId }).lean(),
      Payment.find({
        merchantId: payment.merchantId,
        amount: payment.amount,
        paymentId: { $ne: paymentId }
      }).limit(5).lean()
    ]);

    const hasDuplicateSettlement = duplicateSettlements.length > 1;
    const hasDuplicateRefund = duplicateRefunds.length > 1;

    return serializeDecimals({
      paymentId,
      hasDuplicateSettlement,
      settlementsFound: duplicateSettlements.length,
      settlements: duplicateSettlements,
      hasDuplicateRefund,
      refundsFound: duplicateRefunds.length,
      refunds: duplicateRefunds,
      similarPaymentsInMerchantPool: similarPayments.length,
      similarPayments
    });
  }

  /**
   * Dispatches a tool execution by name
   */
  public static async executeTool(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'retrieve_payment_details':
        return await this.retrievePaymentDetails(args.paymentId);
      case 'retrieve_related_records':
        return await this.retrieveRelatedRecords(args.paymentId);
      case 'calculate_expected_settlement':
        return await this.calculateExpectedSettlement(args.paymentId);
      case 'compare_financial_states':
        return await this.compareFinancialStates(args.paymentId);
      case 'inspect_transaction_history':
        return await this.inspectTransactionHistory(args.merchantId, args.limit);
      case 'search_duplicates':
        return await this.searchDuplicates(args.paymentId);
      default:
        return { error: `Unknown tool name: ${name}` };
    }
  }
}
