import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { logger } from '../config/logger';

export async function healthCheck(req: Request, res: Response) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'error',
      },
      error: error.message,
    });
  }
}

