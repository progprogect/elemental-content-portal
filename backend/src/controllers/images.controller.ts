import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { generateImage } from '../services/image-generator';
import { ImageGenerationSettings } from '../types/prompt-settings';

export const generateImageForPublication = async (req: Request, res: Response) => {
  const { taskId, publicationId } = req.params;
  
  // Data is already validated by middleware
  const data = req.body as ImageGenerationSettings;

  // Verify task exists
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Verify publication exists and belongs to task
  const publication = await prisma.taskPublication.findUnique({
    where: { id: publicationId },
  });
  if (!publication || publication.taskId !== taskId) {
    return res.status(404).json({ error: 'Publication not found' });
  }

  try {
    // Generate image
    const imageResult = await generateImage(data, taskId, publicationId);

    // Create result record
    const result = await prisma.taskResult.create({
      data: {
        taskId,
        publicationId,
        assetUrl: imageResult.assetUrl,
        assetPath: imageResult.assetPath,
        source: 'nanobanana',
      },
    });

    // Update publication status
    await prisma.taskPublication.update({
      where: { id: publicationId },
      data: {
        status: 'completed',
        executionType: 'generated',
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
            executionType: 'generated',
          },
        });
      }
    }

    res.status(201).json({
      assetUrl: result.assetUrl,
      assetPath: result.assetPath,
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    res.status(500).json({
      error: 'Failed to generate image',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

