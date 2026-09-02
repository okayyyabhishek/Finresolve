import { Router, Request, Response, NextFunction } from 'express';
import { EvaluationEngine } from '../services/evaluationEngine';
import { CoverageRiskEngine } from '../services/coverageRiskEngine';
import { Payment } from '../models';

const router = Router();

/**
 * Helper to resolve active batch ID
 */
async function resolveBatchId(paramBatchId?: any): Promise<string | null> {
  if (paramBatchId && typeof paramBatchId === 'string') {
    return paramBatchId;
  }
  const latestPayment = await Payment.findOne().sort({ createdAt: -1 });
  return latestPayment ? latestPayment.batchId : null;
}

/**
 * GET /api/v1/evaluation/metrics
 * Computes all benchmark evaluation metrics against Ground Truth.
 */
router.get('/metrics', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const batchId = await resolveBatchId(req.query.batchId);
    if (!batchId) {
      res.status(200).json({
        status: 'empty',
        message: 'No batch data exists in database.',
        batchId: null,
        totalActualExceptions: 0,
        totalAutoResolved: 0,
        totalEscalated: 0,
        coverage: 0,
        autoResolutionAccuracy: 0,
        exceptionDetectionAccuracy: 0,
        falseAutoResolutionRate: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        financialErrorExposure: '₹0.00',
        escalationRate: 0,
        averageInvestigationDurationMs: 0,
        wallClockDurationMs: 0,
        falseAutoResolutions: 0,
        falseEscalations: 0
      });
      return;
    }

    const metrics = await EvaluationEngine.evaluateBatch(batchId);
    res.status(200).json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/evaluation/coverage-risk
 * Returns confidence threshold sweep curve (21 data points) with optimal trade-off point.
 */
router.get('/coverage-risk', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const batchId = await resolveBatchId(req.query.batchId);
    if (!batchId) {
      res.status(200).json({
        status: 'empty',
        batchId: null,
        sweep: [],
        optimalThreshold: 0.85,
        optimalMetrics: {
          coverage: 0,
          accuracy: 0,
          falseResolutions: 0,
          financialRisk: '₹0.00'
        }
      });
      return;
    }

    const result = await CoverageRiskEngine.sweep(batchId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
