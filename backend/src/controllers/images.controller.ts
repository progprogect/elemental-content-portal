import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { generateImage } from '../services/image-generator';
import { ImageGenerationSettings } from '../types/prompt-settings';

export const generateImageForPublication = async (req: Request, res: Response) => {
  const { taskId, publicationId } = req.params;
  
  // Validate parameters
  if (!taskId || !publicationId) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'taskId and publicationId are required',
    });
  }
  
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
      cause: error.cause,
    });
    
    // Return detailed error information
    const errorResponse: any = {
      error: 'Failed to generate image',
      message: error.message || 'Unknown error',
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = {
        name: error.name,
        code: error.code,
        cause: error.cause,
      };
    }
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Generate image preview without saving to database
 * Used for iterative refinement before final save
 */
export const generateImagePreview = async (req: Request, res: Response) => {
  const { taskId, publicationId } = req.params;
  
  // Validate parameters
  if (!taskId || !publicationId) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'taskId and publicationId are required',
    });
  }
  
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
    // Generate image (without saving to database)
    // Use preview path to distinguish from final results
    const imageResult = await generateImage(data, taskId, publicationId);

    // Return preview result without creating database record
    res.status(200).json({
      assetUrl: imageResult.assetUrl,
      assetPath: imageResult.assetPath,
    });
  } catch (error: any) {
    console.error('Error generating image preview:', error);
    console.error('Error stack:', error.stack);
    
    const errorResponse: any = {
      error: 'Failed to generate image preview',
      message: error.message || 'Unknown error',
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = {
        name: error.name,
        code: error.code,
        cause: error.cause,
      };
    }
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Generate image without task/publication context (standalone mode)
 * Used for generating images directly from sidebar
 */
export const generateStandaloneImage = async (req: Request, res: Response) => {
  // Data is already validated by middleware
  const data = req.body as ImageGenerationSettings;

  try {
    // Generate image without taskId and publicationId
    const imageResult = await generateImage(data, null, null);

    // Return result without saving to database
    // User will save it to gallery separately via addGalleryItem
    res.status(200).json({
      assetUrl: imageResult.assetUrl,
      assetPath: imageResult.assetPath,
    });
  } catch (error: any) {
    console.error('Error generating standalone image:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      cause: error.cause,
    });
    
    // Return detailed error information
    const errorResponse: any = {
      error: 'Failed to generate image',
      message: error.message || 'Unknown error',
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = {
        name: error.name,
        code: error.code,
        cause: error.cause,
      };
    }
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Save image result to database after user confirmation
 * Used after iterative refinement is complete
 */
export const saveImageResult = async (req: Request, res: Response) => {
  const { taskId, publicationId } = req.params;
  
  // Validate parameters
  if (!taskId || !publicationId) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'taskId and publicationId are required',
    });
  }
  
  // Data is already validated by middleware
  const { assetUrl, assetPath } = req.body as { assetUrl: string; assetPath: string };

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
    // Create result record
    const result = await prisma.taskResult.create({
      data: {
        taskId,
        publicationId,
        assetUrl,
        assetPath,
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
    console.error('Error saving image result:', error);
    console.error('Error stack:', error.stack);
    
    const errorResponse: any = {
      error: 'Failed to save image result',
      message: error.message || 'Unknown error',
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = {
        name: error.name,
        code: error.code,
        cause: error.cause,
      };
    }
    
    res.status(500).json(errorResponse);
  }
};

