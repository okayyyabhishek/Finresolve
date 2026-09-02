import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  console.error(`❌ [Error ${statusCode}] ${errorCode}:`, err.message || err);
  if (err.stack && env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // In production, suppress internal details and generic 500 messages
  const isProduction = env.NODE_ENV === 'production';
  res.status(statusCode).json({
    error: isProduction && statusCode === 500
      ? 'An internal server error occurred'
      : (err.message || 'An unexpected error occurred'),
    code: errorCode,
    details: isProduction ? undefined : (err.details || null)
  });
}
