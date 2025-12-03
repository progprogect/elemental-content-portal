import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getPlatforms = async (req: Request, res: Response) => {
  const platforms = await prisma.platform.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  });

  res.json(platforms);
};

