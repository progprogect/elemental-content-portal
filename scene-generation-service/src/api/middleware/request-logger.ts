import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add correlation ID to request for logging
  (req as any).correlationId = correlationId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }, 'HTTP request');
  });

  next();
}

