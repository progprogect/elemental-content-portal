import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createTopicSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  roleIds: z.array(z.string().uuid()).optional().default([]),
});

const updateTopicSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  presentationScript: z.string().optional().nullable(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const getTopics = async (req: Request, res: Response) => {
  const topics = await prisma.trainingTopic.findMany({
    include: {
      roles: {
        include: {
          trainingRole: true,
        },
      },
      assets: {
        orderBy: { createdAt: 'desc' },
      },
      test: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform roles to array format
  const topicsWithRoles = topics.map(topic => ({
    ...topic,
    roles: topic.roles.map(tr => tr.trainingRole),
  }));

  res.json(topicsWithRoles);
};

export const getTopic = async (req: Request, res: Response) => {
  const { id } = req.params;

  const topic = await prisma.trainingTopic.findUnique({
    where: { id },
    include: {
      roles: {
        include: {
          trainingRole: true,
        },
      },
      assets: {
        orderBy: { createdAt: 'desc' },
      },
      test: true,
    },
  });

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  // Transform roles to array format
  const topicWithRoles = {
    ...topic,
    roles: topic.roles.map(tr => tr.trainingRole),
  };

  res.json(topicWithRoles);
};

export const createTopic = async (req: Request, res: Response) => {
  const data = createTopicSchema.parse(req.body);
  const { roleIds, ...topicData } = data;

  // Create topic
  const topic = await prisma.trainingTopic.create({
    data: {
      ...topicData,
      description: topicData.description || null,
    },
  });

  // Create role associations if provided
  if (roleIds && roleIds.length > 0) {
    await prisma.trainingTopicRole.createMany({
      data: roleIds.map(roleId => ({
        topicId: topic.id,
        roleId,
      })),
    });
  }

  // Fetch topic with relations
  const topicWithRelations = await prisma.trainingTopic.findUnique({
    where: { id: topic.id },
    include: {
      roles: {
        include: {
          trainingRole: true,
        },
      },
      assets: true,
      test: true,
    },
  });

  if (!topicWithRelations) {
    return res.status(500).json({ error: 'Failed to create topic' });
  }

  const result = {
    ...topicWithRelations,
    roles: topicWithRelations.roles.map(tr => tr.trainingRole),
  };

  res.status(201).json(result);
};

export const updateTopic = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateTopicSchema.parse(req.body);
  const { roleIds, ...updateData } = data;

  // Check if topic exists
  const existingTopic = await prisma.trainingTopic.findUnique({
    where: { id },
  });

  if (!existingTopic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  // Update topic data
  const updatePayload: any = {};
  if (updateData.title !== undefined) updatePayload.title = updateData.title;
  if (updateData.description !== undefined) updatePayload.description = updateData.description || null;
  if (updateData.presentationScript !== undefined) {
    updatePayload.presentationScript = updateData.presentationScript || null;
  }

  // Update roles if provided
  if (roleIds !== undefined) {
    // Delete existing role associations
    await prisma.trainingTopicRole.deleteMany({
      where: { topicId: id },
    });

    // Create new role associations
    if (roleIds.length > 0) {
      await prisma.trainingTopicRole.createMany({
        data: roleIds.map(roleId => ({
          topicId: id,
          roleId,
        })),
      });
    }
  }

  // Update topic
  await prisma.trainingTopic.update({
    where: { id },
    data: updatePayload,
  });

  // Fetch updated topic with relations
  const updatedTopic = await prisma.trainingTopic.findUnique({
    where: { id },
    include: {
      roles: {
        include: {
          trainingRole: true,
        },
      },
      assets: {
        orderBy: { createdAt: 'desc' },
      },
      test: true,
    },
  });

  if (!updatedTopic) {
    return res.status(500).json({ error: 'Failed to update topic' });
  }

  const result = {
    ...updatedTopic,
    roles: updatedTopic.roles.map(tr => tr.trainingRole),
  };

  res.json(result);
};

export const deleteTopic = async (req: Request, res: Response) => {
  const { id } = req.params;

  const topic = await prisma.trainingTopic.findUnique({
    where: { id },
  });

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  await prisma.trainingTopic.delete({
    where: { id },
  });

  res.status(204).send();
};

