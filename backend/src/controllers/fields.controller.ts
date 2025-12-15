import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { createStorageAdapter } from '../storage';

const createFieldSchema = z.object({
  fieldName: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']),
  fieldValue: z.any(), // JSON value
  orderIndex: z.number().int().optional(),
});

const updateFieldSchema = z.object({
  fieldName: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']).optional(),
  fieldValue: z.any().optional(),
  orderIndex: z.number().int().optional(),
});

const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string().uuid()),
});

export const addField = async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const data = createFieldSchema.parse(req.body);

  // Check if task exists
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Get max orderIndex if not provided
  if (data.orderIndex === undefined) {
    const maxOrder = await prisma.taskField.findFirst({
      where: { taskId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    data.orderIndex = (maxOrder?.orderIndex ?? -1) + 1;
  }

  const field = await prisma.taskField.create({
    data: {
      taskId,
      fieldName: data.fieldName,
      fieldType: data.fieldType,
      fieldValue: data.fieldValue ?? {},
      orderIndex: data.orderIndex ?? 0,
    },
  });

  res.status(201).json(field);
};

export const updateField = async (req: Request, res: Response) => {
  const { id: taskId, fieldId } = req.params;
  const data = updateFieldSchema.parse(req.body);

  const field = await prisma.taskField.update({
    where: {
      id: fieldId,
      taskId, // Ensure field belongs to task
    },
    data,
  });

  res.json(field);
};

export const deleteField = async (req: Request, res: Response) => {
  const { id: taskId, fieldId } = req.params;

  // Получаем поле перед удалением, чтобы знать путь к файлу
  const field = await prisma.taskField.findUnique({
    where: {
      id: fieldId,
      taskId,
    },
  });

  if (!field) {
    return res.status(404).json({ error: 'Field not found' });
  }

  // Удаляем файл из хранилища, если это поле типа 'file' и есть путь
  if (field.fieldType === 'file') {
    const fieldValue = field.fieldValue as { path?: string } | null;
    if (fieldValue?.path) {
      try {
        const storage = createStorageAdapter();
        await storage.delete(fieldValue.path);
      } catch (error) {
        console.error('Storage delete error:', error);
        // Продолжаем удаление из БД даже если удаление из хранилища не удалось
      }
    }
  }

  // Удаляем запись из БД
  await prisma.taskField.delete({
    where: {
      id: fieldId,
      taskId,
    },
  });

  res.status(204).send();
};

export const reorderFields = async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const { fieldIds } = reorderFieldsSchema.parse(req.body);

  // Verify all fields belong to the task
  const fields = await prisma.taskField.findMany({
    where: { taskId, id: { in: fieldIds } },
  });

  if (fields.length !== fieldIds.length) {
    return res.status(400).json({ error: 'Some fields not found or do not belong to task' });
  }

  // Update orderIndex for each field
  await Promise.all(
    fieldIds.map((fieldId, index) =>
      prisma.taskField.update({
        where: { id: fieldId },
        data: { orderIndex: index },
      })
    )
  );

  const updatedFields = await prisma.taskField.findMany({
    where: { taskId },
    orderBy: { orderIndex: 'asc' },
  });

  res.json(updatedFields);
};

