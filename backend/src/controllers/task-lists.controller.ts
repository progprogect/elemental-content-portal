import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createTaskListSchema = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  orderIndex: z.number().int().optional(),
});

const updateTaskListSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  orderIndex: z.number().int().optional(),
});

export const getTaskLists = async (req: Request, res: Response) => {
  const lists = await prisma.taskList.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  // Calculate task counts by status for each list
  const listsWithStats = await Promise.all(
    lists.map(async (list) => {
      const stats = await prisma.task.groupBy({
        by: ['status'],
        where: { listId: list.id },
        _count: true,
      });

      const statsMap = {
        draft: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
      };

      stats.forEach((stat) => {
        if (stat.status in statsMap) {
          statsMap[stat.status as keyof typeof statsMap] = stat._count;
        }
      });

      return {
        ...list,
        taskCount: list._count.tasks,
        stats: statsMap,
      };
    })
  );

  res.json(listsWithStats);
};

export const getTaskListStats = async (req: Request, res: Response) => {
  const { id } = req.params;

  const list = await prisma.taskList.findUnique({
    where: { id },
  });

  if (!list) {
    return res.status(404).json({ error: 'Task list not found' });
  }

  const stats = await prisma.task.groupBy({
    by: ['status'],
    where: { listId: id },
    _count: true,
  });

  const statsMap = {
    draft: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  };

  stats.forEach((stat) => {
    if (stat.status in statsMap) {
      statsMap[stat.status as keyof typeof statsMap] = stat._count;
    }
  });

  res.json(statsMap);
};

export const createTaskList = async (req: Request, res: Response) => {
  const data = createTaskListSchema.parse(req.body);

  // Get max orderIndex if not provided
  if (data.orderIndex === undefined) {
    const maxOrder = await prisma.taskList.findFirst({
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    data.orderIndex = (maxOrder?.orderIndex ?? -1) + 1;
  }

  const list = await prisma.taskList.create({
    data,
  });

  res.status(201).json(list);
};

export const updateTaskList = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateTaskListSchema.parse(req.body);

  const list = await prisma.taskList.update({
    where: { id },
    data,
  });

  res.json(list);
};

export const deleteTaskList = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Set listId to null for all tasks in this list
  await prisma.task.updateMany({
    where: { listId: id },
    data: { listId: null },
  });

  // Delete the list
  await prisma.taskList.delete({
    where: { id },
  });

  res.status(204).send();
};



