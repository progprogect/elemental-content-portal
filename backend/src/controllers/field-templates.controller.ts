import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createFieldTemplateSchema = z.object({
  fieldName: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
});

const updateFieldTemplateSchema = z.object({
  fieldName: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']).optional(),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
});

export const getFieldTemplates = async (req: Request, res: Response) => {
  const templates = await prisma.fieldTemplate.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  res.json(templates);
};

export const getFieldTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;

  const template = await prisma.fieldTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return res.status(404).json({ error: 'Field template not found' });
  }

  res.json(template);
};

export const createFieldTemplate = async (req: Request, res: Response) => {
  const data = createFieldTemplateSchema.parse(req.body);

  // Get max orderIndex if not provided
  if (data.orderIndex === undefined) {
    const maxOrder = await prisma.fieldTemplate.findFirst({
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    data.orderIndex = (maxOrder?.orderIndex ?? -1) + 1;
  }

  const template = await prisma.fieldTemplate.create({
    data,
  });

  res.status(201).json(template);
};

export const updateFieldTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateFieldTemplateSchema.parse(req.body);

  const template = await prisma.fieldTemplate.update({
    where: { id },
    data,
  });

  res.json(template);
};

export const deleteFieldTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.fieldTemplate.delete({
    where: { id },
  });

  res.status(204).send();
};

export const addFieldFromTemplate = async (req: Request, res: Response) => {
  const { id: taskId } = req.params;
  const { templateId } = req.body;

  if (!templateId) {
    return res.status(400).json({ error: 'templateId is required' });
  }

  // Check if task exists
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Get template
  const template = await prisma.fieldTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return res.status(404).json({ error: 'Field template not found' });
  }

  // Get max orderIndex for task fields
  const maxOrder = await prisma.taskField.findFirst({
    where: { taskId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });

  // Create field from template
  const field = await prisma.taskField.create({
    data: {
      taskId,
      fieldName: template.fieldName,
      fieldType: template.fieldType as 'text' | 'file' | 'url' | 'checkbox',
      fieldValue: template.defaultValue || (template.fieldType === 'checkbox' ? { checked: false } : { value: '' }),
      orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
    },
  });

  res.status(201).json(field);
};


