import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuditService } from '../services/auditService';

const router = Router();

const reviewBodySchema = z.object({
  action: z.enum(['approve', 'reject', 'request_more_evidence']),
  reviewer: z.string().optional().default('Human Controller'),
  comment: z.string().optional().default('')
});

/**
 * POST /api/v1/review/:exceptionId
 * Records human supervisor review action on an escalated exception.
 */
router.post('/:exceptionId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { exceptionId } = req.params;
    const parseResult = reviewBodySchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid review payload',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.format()
      });
      return;
    }

    const { action, reviewer, comment } = parseResult.data;

    const result = await AuditService.applyHumanReview({
      exceptionId,
      action,
      reviewer,
      comment
    });

    res.status(200).json({
      success: true,
      message: `Human review '${action}' applied to Exception ${exceptionId}`,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
