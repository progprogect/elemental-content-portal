import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateTest as generateTestService } from '../services/test-generator';

const updateTestSchema = z.object({
  generatedTestContent: z.string().min(1),
});

export const getTest = async (req: Request, res: Response) => {
  const { topicId } = req.params;

  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const test = await prisma.trainingTest.findUnique({
    where: { topicId },
  });

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  // Map to frontend interface format
  res.json({
    id: test.id,
    trainingTopicId: test.topicId,
    generatedTestContent: test.content,
    createdAt: test.generatedAt.toISOString(),
    updatedAt: test.updatedAt.toISOString(),
  });
};

export const generateTest = async (req: Request, res: Response) => {
  const { topicId } = req.params;

  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  if (!topic.presentationScript || topic.presentationScript.trim().length === 0) {
    return res.status(400).json({ error: 'Topic must have a presentation script to generate a test' });
  }

  try {
    // Generate test using service
    const testContent = await generateTestService(topic.presentationScript);

    // Check if test already exists
    const existingTest = await prisma.trainingTest.findUnique({
      where: { topicId },
    });

    let test;
    if (existingTest) {
      // Update existing test
      test = await prisma.trainingTest.update({
        where: { topicId },
        data: {
          content: testContent,
          isEdited: false,
          generatedAt: new Date(),
        },
      });
    } else {
      // Create new test
      test = await prisma.trainingTest.create({
        data: {
          topicId,
          content: testContent,
          isEdited: false,
        },
      });
    }

    // Map to frontend interface format
    const response = {
      id: test.id,
      trainingTopicId: test.topicId,
      generatedTestContent: test.content,
      createdAt: test.generatedAt.toISOString(),
      updatedAt: test.updatedAt.toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Test generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate test',
      message: error.message,
    });
  }
};

export const updateTest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateTestSchema.parse(req.body);

  const test = await prisma.trainingTest.findUnique({
    where: { id },
  });

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const updatedTest = await prisma.trainingTest.update({
    where: { id },
    data: {
      content: data.generatedTestContent,
      isEdited: true,
    },
  });

  // Map to frontend interface format
  res.json({
    id: updatedTest.id,
    trainingTopicId: updatedTest.topicId,
    generatedTestContent: updatedTest.content,
    createdAt: updatedTest.generatedAt.toISOString(),
    updatedAt: updatedTest.updatedAt.toISOString(),
  });
};

