import { Router, Request, Response, NextFunction } from 'express';
import {
  Exception,
  Payment,
  Settlement,
  Fee,
  Refund,
  Adjustment,
  Investigation,
  AuditRecord
} from '../models';
import { serializeDecimals, toDecimal } from '../utils/decimal';
import { FinanceEngine } from '../services/financeEngine';

const router = Router();

/**
 * GET /api/v1/exceptions
 * List all exceptions with optional filtering by status, type, severity, batchId, and paymentId search.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, type, severity, batchId, search, page = 1, limit = 100 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (batchId) query.batchId = batchId;
    if (search) {
      const sanitizedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { exceptionId: { $regex: sanitizedSearch, $options: 'i' } },
        { paymentId: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 100;

    const [total, exceptions] = await Promise.all([
      Exception.countDocuments(query),
      Exception.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean()
    ]);

    // Compute status counts
    const statusCounts = await Exception.aggregate([
      { $match: batchId ? { batchId } : {} },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const countsMap: Record<string, number> = {
      detected: 0,
      investigating: 0,
      auto_resolved: 0,
      escalated: 0,
      human_approved: 0,
      human_rejected: 0
    };

    statusCounts.forEach((item) => {
      countsMap[item._id] = item.count;
    });

    res.status(200).json({
      exceptions: serializeDecimals(exceptions),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      counts: countsMap
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/exceptions/:id
 * Retrieves full details for an individual exception including related records and AI investigation.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const exception = await Exception.findOne({
      $or: [{ exceptionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).lean();

    if (!exception) {
      res.status(404).json({
        error: `Exception with ID ${id} not found`,
        code: 'EXCEPTION_NOT_FOUND'
      });
      return;
    }

    const payId = exception.paymentId;

    // Fetch related records in parallel
    const [payment, settlements, fees, refunds, adjustments, investigation, auditRecord] =
      await Promise.all([
        Payment.findOne({ paymentId: payId }).lean(),
        Settlement.find({ paymentId: payId }).lean(),
        Fee.find({ paymentId: payId }).lean(),
        Refund.find({ paymentId: payId }).lean(),
        Adjustment.find({ paymentId: payId }).lean(),
        Investigation.findOne({ exceptionId: exception.exceptionId }).lean(),
        AuditRecord.findOne({ exceptionId: exception.exceptionId }).lean()
      ]);

    // Financial breakdown calculations
    let financialBreakdown: any = null;
    if (payment) {
      const paymentAmount = toDecimal(payment.amount);
      const feeCalc = FinanceEngine.calculateFee(paymentAmount, payment.method);
      const expectedResult = FinanceEngine.calculateExpectedSettlement(
        paymentAmount,
        feeCalc.baseFee,
        feeCalc.gst,
        refunds.map((r) => ({ amount: toDecimal(r.amount) })),
        adjustments.map((a) => ({ amount: toDecimal(a.amount), type: a.type }))
      );

      const actualSettlement = settlements.length > 0 ? settlements[0] : null;

      financialBreakdown = {
        expected: {
          paymentAmount: paymentAmount.toFixed(2),
          baseFee: feeCalc.baseFee.toFixed(2),
          feeRate: `${feeCalc.rateApplied.times(100).toFixed(2)}%`,
          gst: feeCalc.gst.toFixed(2),
          totalFee: feeCalc.totalFee.toFixed(2),
          totalRefunds: expectedResult.breakdown.totalRefunds.toFixed(2),
          totalAdjustments: expectedResult.breakdown.totalAdjustments.toFixed(2),
          expectedNetAmount: expectedResult.expectedNetAmount.toFixed(2)
        },
        actual: actualSettlement
          ? {
              grossAmount: toDecimal(actualSettlement.grossAmount).toFixed(2),
              feeAmount: toDecimal(actualSettlement.feeAmount).toFixed(2),
              taxAmount: toDecimal(actualSettlement.taxAmount).toFixed(2),
              netAmount: toDecimal(actualSettlement.netAmount).toFixed(2),
              utr: actualSettlement.utr,
              settledAt: actualSettlement.settledAt
            }
          : null,
        discrepancy: toDecimal(exception.discrepancy).toFixed(2),
        direction: toDecimal(exception.discrepancy).isNegative()
          ? 'shortfall'
          : toDecimal(exception.discrepancy).isPositive()
          ? 'excess'
          : 'matched'
      };
    }

    res.status(200).json(
      serializeDecimals({
        exception,
        payment,
        settlements,
        fees,
        refunds,
        adjustments,
        investigation,
        auditRecord,
        financialBreakdown
      })
    );
  } catch (error) {
    next(error);
  }
});

export default router;
