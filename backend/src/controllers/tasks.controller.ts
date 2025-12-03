import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  contentType: z.string().min(1).max(50),
  executionType: z.enum(['manual', 'generated']).optional().default('manual'),
  listId: z.string().uuid().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  contentType: z.string().min(1).max(50).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed']).optional(),
  executionType: z.enum(['manual', 'generated']).optional(),
  listId: z.string().uuid().optional().nullable(),
});

export const getTasks = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const contentType = req.query.contentType as string | undefined;
  const listId = req.query.listId as string | undefined;

  const where: any = {};
  if (status) where.status = status;
  if (contentType) where.contentType = contentType;
  if (listId) {
    // If listId is provided, filter by it
    // If listId is 'null' or 'unassigned', filter for tasks without list
    if (listId === 'null' || listId === 'unassigned') {
      where.listId = null;
    } else {
      where.listId = listId;
    }
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        list: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        fields: {
          orderBy: { orderIndex: 'asc' },
        },
        results: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  res.json({
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

export const getTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      list: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      },
      fields: {
        orderBy: { orderIndex: 'asc' },
      },
      results: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
};

export const createTask = async (req: Request, res: Response) => {
  const data = createTaskSchema.parse(req.body);

  const task = await prisma.task.create({
    data: {
      ...data,
      userId: null, // No auth for MVP
    },
    include: {
      fields: true,
      results: true,
    },
  });

  res.status(201).json(task);
};

export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateTaskSchema.parse(req.body);

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      fields: {
        orderBy: { orderIndex: 'asc' },
      },
      results: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  res.json(task);
};

export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.task.delete({
    where: { id },
  });

  res.status(204).send();
};

