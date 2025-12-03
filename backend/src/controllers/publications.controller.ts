import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

// Helper function to update task status based on publication statuses
async function updateTaskStatusFromPublications(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const publications = await prisma.taskPublication.findMany({
    where: { taskId },
  });

  if (publications.length === 0) {
    // No publications - keep task status as is
    return;
  }

  const allCompleted = publications.every(p => p.status === 'completed');
  const hasInProgress = publications.some(p => p.status === 'in_progress');
  const hasFailed = publications.some(p => p.status === 'failed');

  let newStatus = task.status;
  if (allCompleted && publications.length > 0) {
    newStatus = 'completed';
  } else if (hasFailed) {
    newStatus = 'failed';
  } else if (hasInProgress || publications.some(p => p.status === 'draft')) {
    newStatus = 'in_progress';
  }

  if (newStatus !== task.status) {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
    });
  }
}

const createPublicationSchema = z.object({
  platform: z.string().min(1).max(50),
  contentType: z.string().min(1).max(50),
  executionType: z.enum(['manual', 'generated']).optional().default('manual'),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed']).optional().default('draft'),
  note: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  orderIndex: z.number().int().optional().default(0),
});

const updatePublicationSchema = z.object({
  platform: z.string().min(1).max(50).optional(),
  contentType: z.string().min(1).max(50).optional(),
  executionType: z.enum(['manual', 'generated']).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed']).optional(),
  note: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  orderIndex: z.number().int().optional(),
});

export const getPublications = async (req: Request, res: Response) => {
  const { id: taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const publications = await prisma.taskPublication.findMany({
    where: { taskId },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    include: {
      results: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  res.json(publications);
};

export const createPublication = async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const data = createPublicationSchema.parse(req.body);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Verify platform exists
  const platform = await prisma.platform.findUnique({
    where: { code: data.platform },
  });
  if (!platform) {
    return res.status(400).json({ error: 'Platform not found' });
  }

  const publication = await prisma.taskPublication.create({
    data: {
      ...data,
      taskId,
      note: data.note || null,
      content: data.content || null,
    },
    include: {
      results: true,
    },
  });

  res.status(201).json(publication);
};

export const updatePublication = async (req: Request, res: Response) => {
  const { id: taskId, publicationId } = req.params;
  const data = updatePublicationSchema.parse(req.body);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const publication = await prisma.taskPublication.findUnique({
    where: { id: publicationId },
  });
  if (!publication || publication.taskId !== taskId) {
    return res.status(404).json({ error: 'Publication not found' });
  }

  // Verify platform exists if updating platform
  if (data.platform) {
    const platform = await prisma.platform.findUnique({
      where: { code: data.platform },
    });
    if (!platform) {
      return res.status(400).json({ error: 'Platform not found' });
    }
  }

  const updateData: Partial<{
    platform: string;
    contentType: string;
    executionType: 'manual' | 'generated';
    status: 'draft' | 'in_progress' | 'completed' | 'failed';
    note: string | null;
    content: string | null;
    orderIndex: number;
  }> = { ...data };
  
  if (updateData.note === undefined) {
    delete updateData.note;
  } else {
    updateData.note = updateData.note || null;
  }
  if (updateData.content === undefined) {
    delete updateData.content;
  } else {
    updateData.content = updateData.content || null;
  }

  const updatedPublication = await prisma.taskPublication.update({
    where: { id: publicationId },
    data: updateData,
    include: {
      results: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Update task status based on all publication statuses
  await updateTaskStatusFromPublications(taskId);

  res.json(updatedPublication);
};

export const deletePublication = async (req: Request, res: Response) => {
  const { id: taskId, publicationId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const publication = await prisma.taskPublication.findUnique({
    where: { id: publicationId },
  });
  if (!publication || publication.taskId !== taskId) {
    return res.status(404).json({ error: 'Publication not found' });
  }

  await prisma.taskPublication.delete({
    where: { id: publicationId },
  });

  // Update task status based on remaining publication statuses
  await updateTaskStatusFromPublications(taskId);

  res.status(204).send();
};

