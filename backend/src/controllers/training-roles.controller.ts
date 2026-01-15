import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createRoleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
});

export const getRoles = async (req: Request, res: Response) => {
  const roles = await prisma.trainingRole.findMany({
    orderBy: { name: 'asc' },
  });

  res.json(roles);
};

export const createRole = async (req: Request, res: Response) => {
  const data = createRoleSchema.parse(req.body);

  // Check if role with same name already exists (case-insensitive)
  const existingRole = await prisma.trainingRole.findFirst({
    where: {
      name: {
        equals: data.name,
        mode: 'insensitive',
      },
    },
  });

  if (existingRole) {
    return res.status(400).json({ error: 'Role with this name already exists' });
  }

  const role = await prisma.trainingRole.create({
    data: {
      name: data.name,
      description: data.description || null,
    },
  });

  res.status(201).json(role);
};

export const updateRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateRoleSchema.parse(req.body);

  const role = await prisma.trainingRole.findUnique({
    where: { id },
  });

  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  // Check for duplicate name if updating name
  if (data.name && data.name !== role.name) {
    const existingRole = await prisma.trainingRole.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
        id: {
          not: id,
        },
      },
    });

    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description || null;

  const updatedRole = await prisma.trainingRole.update({
    where: { id },
    data: updateData,
  });

  res.json(updatedRole);
};

export const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params;

  const role = await prisma.trainingRole.findUnique({
    where: { id },
    include: {
      topics: {
        take: 1,
      },
    },
  });

  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  // Check if role is used in any topics
  if (role.topics.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete role that is assigned to topics',
      topicsCount: role.topics.length,
    });
  }

  await prisma.trainingRole.delete({
    where: { id },
  });

  res.status(204).send();
};







