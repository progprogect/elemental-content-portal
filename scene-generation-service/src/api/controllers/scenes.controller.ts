import { Request, Response } from 'express';
import { prisma } from '../../database/prisma';
import { logger } from '../../config/logger';
import { GenerationRequest } from '../../types/scene-generation';

/**
 * @swagger
 * /api/v1/scenes/generate:
 *   post:
 *     summary: Start scene generation
 *     tags: [Scenes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *               videos:
 *                 type: array
 *                 items:
 *                   type: object
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *               references:
 *                 type: array
 *                 items:
 *                   type: object
 *               aspectRatio:
 *                 type: number
 *     responses:
 *       201:
 *         description: Generation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 */
export async function generateScenes(req: Request, res: Response) {
  const data = req.body as GenerationRequest;

  logger.info({ 
    reviewScenario: data.reviewScenario, 
    reviewScenes: data.reviewScenes,
    reviewScenarioType: typeof data.reviewScenario,
    reviewScenesType: typeof data.reviewScenes,
  }, 'Received generation request with review flags');

  try {
    // Handle both boolean and string values from HTTP requests
    // TypeScript sees this as boolean | undefined, but HTTP can send strings
    const reviewScenarioValue = data.reviewScenario as boolean | string | undefined;
    const reviewScenesValue = data.reviewScenes as boolean | string | undefined;
    const reviewScenario = reviewScenarioValue === true || reviewScenarioValue === 'true' || String(reviewScenarioValue) === 'true';
    const reviewScenes = reviewScenesValue === true || reviewScenesValue === 'true' || String(reviewScenesValue) === 'true';

    logger.info({ 
      reviewScenario, 
      reviewScenes,
      originalReviewScenario: data.reviewScenario,
      originalReviewScenes: data.reviewScenes,
    }, 'Processed review flags for database');

    const generation = await prisma.sceneGeneration.create({
      data: {
        prompt: data.prompt,
        taskId: data.taskId || null,
        publicationId: data.publicationId || null,
        status: 'queued',
        phase: 'phase0',
        progress: 0,
        reviewScenario,
        reviewScenes,
      },
    });

    // Verify that review flags were saved correctly
    const savedGeneration = await prisma.sceneGeneration.findUnique({
      where: { id: generation.id },
      select: { reviewScenario: true, reviewScenes: true },
    });
    logger.info({ 
      generationId: generation.id,
      savedReviewScenario: savedGeneration?.reviewScenario,
      savedReviewScenes: savedGeneration?.reviewScenes,
    }, 'Verified review flags in database after creation');

    // Add job to queue (or execute directly if Redis unavailable)
    try {
      const { sceneGenerationQueue } = await import('../../jobs/scene-generation.job');
      await sceneGenerationQueue.add('generate', {
        generationId: generation.id,
        request: data,
      });
    } catch (queueError: any) {
      // If queue is unavailable, execute directly
      if (queueError.message?.includes('Redis') || queueError.message?.includes('not available')) {
        logger.warn({ generationId: generation.id }, 'Queue unavailable, executing generation directly');
        const { executeGeneration } = await import('../../services/orchestrator');
        // Execute in background (don't await)
        executeGeneration(generation.id, data).catch((err) => {
          logger.error({ error: err, generationId: generation.id }, 'Direct generation execution failed');
        });
      } else {
        throw queueError;
      }
    }

    logger.info({ generationId: generation.id }, 'Scene generation created and queued');

    res.status(201).json({
      id: generation.id,
      status: generation.status,
      phase: generation.phase,
      progress: generation.progress,
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create scene generation');
    throw error;
  }
}

/**
 * @swagger
 * /api/v1/scenes/{generationId}:
 *   get:
 *     summary: Get generation status
 *     tags: [Scenes]
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Generation status
 */
/**
 * @swagger
 * /api/v1/scenes:
 *   get:
 *     summary: List scene generations
 *     tags: [Scenes]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: phase
 *         schema:
 *           type: string
 *         description: Filter by phase
 *     responses:
 *       200:
 *         description: List of scene generations
 */
export async function listGenerations(req: Request, res: Response) {
  const { status, phase } = req.query;

  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (phase) {
    where.phase = phase;
  }

  const generations = await prisma.sceneGeneration.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit to 100 most recent
    include: {
      scenes: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  res.json(generations);
}

/**
 * @swagger
 * /api/v1/scenes/{generationId}:
 *   get:
 *     summary: Get generation status
 *     tags: [Scenes]
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Generation status
 */
export async function getGenerationStatus(req: Request, res: Response) {
  const { generationId } = req.params;

  const generation = await prisma.sceneGeneration.findUnique({
    where: { id: generationId },
    include: {
      scenes: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!generation) {
    return res.status(404).json({ error: 'Generation not found' });
  }

  res.json(generation);
}

/**
 * @swagger
 * /api/v1/scenes/{generationId}/scenario:
 *   get:
 *     summary: Get scenario for review
 *     tags: [Scenes]
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario
 */
export async function getScenario(req: Request, res: Response) {
  const { generationId } = req.params;

  const generation = await prisma.sceneGeneration.findUnique({
    where: { id: generationId },
    select: {
      id: true,
      scenario: true,
      status: true,
      phase: true,
    },
  });

  if (!generation) {
    return res.status(404).json({ error: 'Generation not found' });
  }

  if (!generation.scenario) {
    return res.status(404).json({ error: 'Scenario not available yet' });
  }

  res.json({
    id: generation.id,
    scenario: generation.scenario,
    status: generation.status,
    phase: generation.phase,
  });
}

/**
 * @swagger
 * /api/v1/scenes/{generationId}/scenario:
 *   put:
 *     summary: Update scenario
 *     tags: [Scenes]
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scenario:
 *                 type: object
 *     responses:
 *       200:
 *         description: Scenario updated
 */
export async function updateScenario(req: Request, res: Response) {
  const { generationId } = req.params;
  const { scenario } = req.body;

  // Validate scenario structure
  if (!scenario || !scenario.timeline || !Array.isArray(scenario.timeline)) {
    return res.status(400).json({
      error: 'Invalid scenario structure: timeline array is required',
    });
  }

  // Validate each timeline item
  for (const item of scenario.timeline) {
    if (!item.id || !item.kind || !item.detailedRequest) {
      return res.status(400).json({
        error: `Invalid timeline item: missing required fields (id, kind, or detailedRequest)`,
      });
    }
  }

  const generation = await prisma.sceneGeneration.update({
    where: { id: generationId },
    data: {
      scenario: scenario,
    },
  });

  res.json({
    id: generation.id,
    scenario: generation.scenario,
  });
}

/**
 * @swagger
 * /api/v1/scenes/{generationId}:
 *   delete:
 *     summary: Cancel generation
 *     tags: [Scenes]
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Generation cancelled
 */
export async function cancelGeneration(req: Request, res: Response) {
  const { generationId } = req.params;

  const generation = await prisma.sceneGeneration.update({
    where: { id: generationId },
    data: {
      status: 'cancelled',
    },
  });

  // Cancel job in queue (if available)
  try {
    const { sceneGenerationQueue } = await import('../../jobs/scene-generation.job');
    if (sceneGenerationQueue && typeof sceneGenerationQueue.getJobs === 'function') {
      const jobs = await sceneGenerationQueue.getJobs(['active', 'waiting', 'delayed']);
      const job = jobs.find((j) => j.data?.generationId === generationId);
      if (job) {
        await job.remove();
      }
    }
  } catch (error: any) {
    // Queue may not be available (Redis down), but cancellation is still successful
    logger.warn({ error: error.message, generationId }, 'Failed to cancel job in queue, but generation status updated');
  }

  res.json({
    id: generation.id,
    status: generation.status,
  });
}

/**
 * @swagger
 * /api/v1/scenes/{generationId}/continue:
 *   post:
 *     summary: Continue generation after review
 *     tags: [Scenes]
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Generation continued
 *       400:
 *         description: Cannot continue generation (invalid status)
 */
export async function continueGeneration(req: Request, res: Response) {
  const { generationId } = req.params;

  try {
    const { continueGeneration: continueGenerationFn } = await import('../../services/orchestrator');
    
    // Add job to queue (or execute directly if Redis unavailable)
    try {
      const { sceneGenerationQueue } = await import('../../jobs/scene-generation.job');
      await sceneGenerationQueue.add('continue', {
        generationId,
      });
    } catch (queueError: any) {
      // If queue is unavailable, execute directly
      if (queueError.message?.includes('Redis') || queueError.message?.includes('not available')) {
        logger.warn({ generationId }, 'Queue unavailable, executing continuation directly');
        // Execute in background (don't await)
        continueGenerationFn(generationId).catch((err) => {
          logger.error({ error: err, generationId }, 'Direct generation continuation failed');
        });
      } else {
        throw queueError;
      }
    }

    logger.info({ generationId }, 'Generation continuation queued');

    res.json({
      id: generationId,
      status: 'processing',
    });
  } catch (error: any) {
    logger.error({ error, generationId }, 'Failed to continue generation');
    res.status(400).json({
      error: 'Failed to continue generation',
      message: error.message,
    });
  }
}

/**
 * @swagger
 * /api/v1/scenes/{generationId}/scenes/{sceneId}/regenerate:
 *   post:
 *     summary: Regenerate a specific scene
 *     tags: [Scenes]
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sceneId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scene regeneration started
 */
export async function regenerateScene(req: Request, res: Response) {
  const { generationId, sceneId } = req.params;

  const scene = await prisma.scene.findFirst({
    where: {
      sceneGenerationId: generationId,
      sceneId: sceneId,
    },
    include: {
      sceneGeneration: true,
    },
  });

  if (!scene) {
    return res.status(404).json({ error: 'Scene not found' });
  }

  // Update scene status to pending
  await prisma.scene.update({
    where: { id: scene.id },
    data: {
      status: 'pending',
      progress: 0,
      error: null,
    },
  });

  // Get scene project from scene data
  const sceneProject = scene.sceneProject as any;

  if (!sceneProject) {
    return res.status(400).json({ error: 'Scene project not found' });
  }

  // Add job to queue for scene regeneration (or execute directly if queue unavailable)
  try {
    const { sceneGenerationQueue } = await import('../../jobs/scene-generation.job');
    await sceneGenerationQueue.add('regenerate-scene', {
      generationId,
      sceneId: scene.id,
      sceneProject,
    });
    logger.info({ generationId, sceneId }, 'Scene regeneration queued');
  } catch (queueError: any) {
    // If queue is unavailable, execute directly
    if (queueError.message?.includes('Redis') || queueError.message?.includes('not available')) {
      logger.warn({ generationId, sceneId }, 'Queue unavailable, executing scene regeneration directly');
      const { pipelineRegistry } = await import('../../pipelines/pipeline-registry');
      const { createStorageAdapter } = await import('@elemental-content/shared-ai-lib');
      const { emitSceneComplete } = await import('../../websocket/scene-generation-socket');
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs');

      const storage = createStorageAdapter();
      const tempDir = path.join(os.tmpdir(), `regeneration-${generationId}-${scene.id}`);

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      try {
        const renderContext = { storage, tempDir };
        const renderedScene = await pipelineRegistry.render(sceneProject, renderContext);
        await prisma.scene.update({
          where: { id: scene.id },
          data: {
            status: 'completed',
            progress: 100,
            renderedAssetPath: renderedScene.renderedAssetPath,
            renderedAssetUrl: renderedScene.renderedAssetUrl,
            error: null,
          },
        });
        emitSceneComplete(generationId, renderedScene.sceneId, renderedScene.renderedAssetUrl);
        logger.info({ generationId, sceneId }, 'Scene regeneration completed directly');
      } finally {
        try {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        } catch (cleanupError) {
          logger.warn({ error: cleanupError, tempDir }, 'Failed to cleanup temp directory');
        }
      }
    } else {
      throw queueError;
    }
  }

  res.json({
    id: scene.id,
    sceneId: scene.sceneId,
    status: 'pending',
  });
}

/**
 * Get debug frames for a scene
 */
export async function getDebugFrames(req: Request, res: Response) {
  const { generationId, sceneId } = req.params;

  const scene = await prisma.scene.findFirst({
    where: {
      sceneGenerationId: generationId,
      sceneId: sceneId,
    },
  });

  if (!scene) {
    return res.status(404).json({ error: 'Scene not found' });
  }

  // Build debug frame URLs based on storage path pattern
  const { createStorageAdapter } = await import('@elemental-content/shared-ai-lib');
  const storage = createStorageAdapter();
  
  // Debug frames are saved at: scene-generation/debug-frames/{sceneId}/frame-*.png
  const debugFrames: Array<{ frame: number; url: string; path: string }> = [];
  
  // Try to get frames: frame-000000.png, frame-middle, frame-last
  // We'll construct URLs based on the storage adapter
  const basePath = `scene-generation/debug-frames/${sceneId}`;
  
  // For now, return the base path - the actual URLs will be in logs
  // In production, we could list files in storage or store URLs in DB
  res.json({
    sceneId,
    generationId,
    debugFramesPath: basePath,
    note: 'Debug frame URLs are logged during generation. Check server logs for actual URLs.',
  });
}

