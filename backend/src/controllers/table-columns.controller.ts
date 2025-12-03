import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createTableColumnSchema = z.object({
  fieldName: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
});

const updateTableColumnSchema = z.object({
  fieldName: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']).optional(),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
});

export const getTableColumns = async (req: Request, res: Response) => {
  const columns = await prisma.tableColumn.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  res.json(columns);
};

export const getTableColumn = async (req: Request, res: Response) => {
  const { id } = req.params;

  const column = await prisma.tableColumn.findUnique({
    where: { id },
  });

  if (!column) {
    return res.status(404).json({ error: 'Table column not found' });
  }

  res.json(column);
};

export const createTableColumn = async (req: Request, res: Response) => {
  const data = createTableColumnSchema.parse(req.body);

  // Get max orderIndex if not provided
  let orderIndex = data.orderIndex;
  if (orderIndex === undefined) {
    const maxOrder = await prisma.tableColumn.findFirst({
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    orderIndex = (maxOrder?.orderIndex ?? -1) + 1;
  }

  // Create the column
  const column = await prisma.tableColumn.create({
    data: {
      ...data,
      orderIndex,
    },
  });

  // Automatically create fields for all existing tasks
  const allTasks = await prisma.task.findMany({
    select: { id: true },
  });

  if (allTasks.length > 0) {
    // Prepare field value based on column type and default value
    let fieldValue: any;
    if (data.defaultValue) {
      fieldValue = data.defaultValue;
    } else if (data.fieldType === 'checkbox') {
      fieldValue = { checked: false };
    } else {
      fieldValue = { value: '' };
    }

    // Create fields for all tasks in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < allTasks.length; i += batchSize) {
      const batch = allTasks.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (task) => {
          // Check if field already exists for this task with this fieldName
          const existingField = await prisma.taskField.findFirst({
            where: {
              taskId: task.id,
              fieldName: data.fieldName,
            },
          });

          if (!existingField) {
            // Get max orderIndex for this task
            const maxOrder = await prisma.taskField.findFirst({
              where: { taskId: task.id },
              orderBy: { orderIndex: 'desc' },
              select: { orderIndex: true },
            });

            await prisma.taskField.create({
              data: {
                taskId: task.id,
                fieldName: data.fieldName,
                fieldType: data.fieldType,
                fieldValue,
                orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
              },
            });
          }
        })
      );
    }
  }

  res.status(201).json(column);
};

export const updateTableColumn = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateTableColumnSchema.parse(req.body);

  // Get column before update to check if fieldName changed
  const oldColumn = await prisma.tableColumn.findUnique({
    where: { id },
  });

  if (!oldColumn) {
    return res.status(404).json({ error: 'Table column not found' });
  }

  // Update the column
  const column = await prisma.tableColumn.update({
    where: { id },
    data,
  });

  // If fieldName changed, update all existing task fields to match
  if (data.fieldName && data.fieldName !== oldColumn.fieldName) {
    await prisma.taskField.updateMany({
      where: {
        fieldName: oldColumn.fieldName,
      },
      data: {
        fieldName: data.fieldName,
        // Also update fieldType if it changed
        ...(data.fieldType && { fieldType: data.fieldType }),
      },
    });
  } else if (data.fieldType && data.fieldType !== oldColumn.fieldType) {
    // If only fieldType changed, update all fields
    await prisma.taskField.updateMany({
      where: {
        fieldName: oldColumn.fieldName,
      },
      data: {
        fieldType: data.fieldType,
      },
    });
  }

  res.json(column);
};

export const deleteTableColumn = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get column info before deletion
  const column = await prisma.tableColumn.findUnique({
    where: { id },
  });

  if (!column) {
    return res.status(404).json({ error: 'Table column not found' });
  }

  // Delete all fields with this fieldName from all tasks
  await prisma.taskField.deleteMany({
    where: {
      fieldName: column.fieldName,
    },
  });

  // Delete the column
  await prisma.tableColumn.delete({
    where: { id },
  });

  res.status(204).send();
};

