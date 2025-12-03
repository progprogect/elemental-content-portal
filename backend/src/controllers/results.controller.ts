import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createResultSchema = z.object({
  resultUrl: z.union([z.string().url(), z.literal('')]).optional(),
  downloadUrl: z.union([z.string().url(), z.literal('')]).optional(),
  assetPath: z.string().optional(),
  assetUrl: z.union([z.string().url(), z.literal('')]).optional(),
  source: z.enum(['manual', 'haygen', 'nanobanana']).default('manual'),
  publicationId: z.string().uuid().optional().nullable(),
});

export const getResults = async (req: Request, res: Response) => {
  const { id: taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const results = await prisma.taskResult.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(results);
};

export const addResult = async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const data = createResultSchema.parse(req.body);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Verify publication exists and belongs to task if publicationId is provided
  if (data.publicationId) {
    const publication = await prisma.taskPublication.findUnique({
      where: { id: data.publicationId },
    });
    if (!publication || publication.taskId !== taskId) {
      return res.status(404).json({ error: 'Publication not found' });
    }
  }

  const result = await prisma.taskResult.create({
    data: {
      ...data,
      taskId,
      publicationId: data.publicationId || null,
    },
  });

  // Update task status if needed
  if (task.status === 'draft' || task.status === 'in_progress') {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        executionType: data.source === 'manual' ? 'manual' : 'generated',
      },
    });
  }

  // Update publication status if publicationId is provided
  if (data.publicationId) {
    await prisma.taskPublication.update({
      where: { id: data.publicationId },
      data: {
        status: 'completed',
        executionType: data.source === 'manual' ? 'manual' : 'generated',
      },
    });
  }

  res.status(201).json(result);
};

export const deleteResult = async (req: Request, res: Response) => {
  const { id: taskId, resultId } = req.params;

  await prisma.taskResult.delete({
    where: {
      id: resultId,
      taskId,
    },
  });

  res.status(204).send();
};

