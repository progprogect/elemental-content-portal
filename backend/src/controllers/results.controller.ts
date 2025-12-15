import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { createStorageAdapter } from '../storage';

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

  // Update publication status if publicationId is provided
  if (data.publicationId) {
    await prisma.taskPublication.update({
      where: { id: data.publicationId },
      data: {
        status: 'completed',
        executionType: data.source === 'manual' ? 'manual' : 'generated',
      },
    });

    // Check if all publications are completed to update task status
    const allPublications = await prisma.taskPublication.findMany({
      where: { taskId },
    });

    if (allPublications.length > 0) {
      const allCompleted = allPublications.every(p => p.status === 'completed');
      if (allCompleted) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'completed',
            executionType: data.source === 'manual' ? 'manual' : 'generated',
          },
        });
      }
    }
  }

  res.status(201).json(result);
};

export const deleteResult = async (req: Request, res: Response) => {
  const { id: taskId, resultId } = req.params;

  // Получаем результат перед удалением, чтобы знать путь к файлу
  const result = await prisma.taskResult.findUnique({
    where: {
      id: resultId,
      taskId,
    },
  });

  if (!result) {
    return res.status(404).json({ error: 'Result not found' });
  }

  // Удаляем файл из хранилища, если он есть
  if (result.assetPath) {
    try {
      const storage = createStorageAdapter();
      await storage.delete(result.assetPath);
    } catch (error) {
      console.error('Storage delete error:', error);
      // Продолжаем удаление из БД даже если удаление из хранилища не удалось
      // (файл может быть уже удален или хранилище недоступно)
    }
  }

  // Удаляем запись из БД
  await prisma.taskResult.delete({
    where: {
      id: resultId,
      taskId,
    },
  });

  res.status(204).send();
};

