import { Router, Request, Response, NextFunction } from 'express';
import { AuditRecord } from '../models';
import { serializeDecimals } from '../utils/decimal';
import { AuditService } from '../services/auditService';

const router = Router();

/**
 * GET /api/v1/audit
 * Retrieves all audit records with pagination and filters.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId, exceptionId, policyDecision, page = 1, limit = 50 } = req.query;

    const result = await AuditService.getAuditRecords(
      {
        batchId: batchId as string,
        exceptionId: exceptionId as string,
        policyDecision: policyDecision as string
      },
      parseInt(page as string, 10) || 1,
      parseInt(limit as string, 10) || 50
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/audit/:exceptionId
 * Retrieves the audit trail record for a specific exception.
 */
router.get('/:exceptionId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { exceptionId } = req.params;

    const auditRecord = await AuditRecord.findOne({ exceptionId })
      .sort({ createdAt: -1 })
      .lean();

    if (!auditRecord) {
      res.status(404).json({
        error: `Audit record for Exception ${exceptionId} not found`,
        code: 'AUDIT_NOT_FOUND'
      });
      return;
    }

    res.status(200).json(serializeDecimals(auditRecord));
  } catch (error) {
    next(error);
  }
});

export default router;
