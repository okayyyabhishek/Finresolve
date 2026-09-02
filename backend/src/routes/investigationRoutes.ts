import { Router, Request, Response, NextFunction } from 'express';
import { Investigation } from '../models';
import { serializeDecimals } from '../utils/decimal';

const router = Router();

/**
 * GET /api/v1/investigations/:exceptionId
 * Retrieves the investigation report and evidence chain for a specific exception.
 */
router.get('/:exceptionId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { exceptionId } = req.params;

    const investigation = await Investigation.findOne({ exceptionId }).lean();
    if (!investigation) {
      res.status(404).json({
        error: `Investigation for Exception ${exceptionId} not found`,
        code: 'INVESTIGATION_NOT_FOUND'
      });
      return;
    }

    res.status(200).json(serializeDecimals(investigation));
  } catch (error) {
    next(error);
  }
});

export default router;
