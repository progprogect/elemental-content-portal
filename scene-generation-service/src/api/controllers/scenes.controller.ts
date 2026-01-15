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

  try {
    const generation = await prisma.sceneGeneration.create({
      data: {
        prompt: data.prompt,
        taskId: data.taskId || null,
        publicationId: data.publicationId || null,
        status: 'queued',
        phase: 'phase0',
        progress: 0,
      },
    });

    // Add job to queue
    const { sceneGenerationQueue } = await import('../../jobs/scene-generation.job');
    await sceneGenerationQueue.add('generate', {
      generationId: generation.id,
      request: data,
    });

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
        take: 1, // Just to check if scenes exist
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

  // Cancel job in queue
  const { sceneGenerationQueue } = await import('../../jobs/scene-generation.job');
  const jobs = await sceneGenerationQueue.getJobs(['active', 'waiting', 'delayed']);
  const job = jobs.find((j) => j.data.generationId === generationId);
  if (job) {
    await job.remove();
  }

  res.json({
    id: generation.id,
    status: generation.status,
  });
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

  // Add job to queue for scene regeneration
  const { sceneGenerationQueue } = await import('../../jobs/scene-generation.job');
  await sceneGenerationQueue.add('regenerate-scene', {
    generationId,
    sceneId: scene.id,
    sceneProject,
  });

  logger.info({ generationId, sceneId }, 'Scene regeneration queued');

  res.json({
    id: scene.id,
    sceneId: scene.sceneId,
    status: 'pending',
  });
}

