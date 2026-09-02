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
        status: 'not_evaluated',
        message: 'No batch data exists in database. Please generate and process a batch first.'
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
        status: 'not_evaluated',
        message: 'No batch data exists in database. Please generate and process a batch first.'
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
