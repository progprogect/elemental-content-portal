import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err, path: req.path, method: req.method }, 'Request error');

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Record not found',
      });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate entry',
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'Invalid reference - related record does not exist',
      });
    }
  }

  if (err.message.includes('not found')) {
    return res.status(404).json({
      error: err.message,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

