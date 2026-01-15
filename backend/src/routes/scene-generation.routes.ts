import { Router } from 'express';
import { sceneGenerationClient } from '../services/scene-generation-client';
import { asyncHandler } from '../utils/async-handler';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

const generateRequestSchema = z.object({
  prompt: z.string().min(1),
  videos: z.array(z.object({
    id: z.string(),
    path: z.string(),
  })).optional(),
  images: z.array(z.object({
    id: z.string(),
    path: z.string(),
  })).optional(),
  references: z.array(z.object({
    id: z.string(),
    pathOrUrl: z.string(),
  })).optional(),
  aspectRatio: z.number().optional(),
  reviewScenario: z.boolean().optional(),
  reviewScenes: z.boolean().optional(),
  taskId: z.string().optional(),
  publicationId: z.string().optional(),
});

const updateScenarioSchema = z.object({
  scenario: z.any(),
});

/**
 * @swagger
 * /api/scene-generation/generate:
 *   post:
 *     summary: Start scene generation (proxy to Scene Generation Service)
 *     tags: [Scene Generation]
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
 *               images:
 *                 type: array
 *               references:
 *                 type: array
 */
router.post(
  '/generate',
  validate(generateRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await sceneGenerationClient.generateScenes(req.body);
    res.status(201).json(result);
  })
);

/**
 * @swagger
 * /api/scene-generation:
 *   get:
 *     summary: List scene generations (proxy to Scene Generation Service)
 *     tags: [Scene Generation]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: phase
 *         schema:
 *           type: string
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = req.query as { status?: string; phase?: string };
    const result = await sceneGenerationClient.getGenerations(filters);
    res.json(result);
  })
);

/**
 * @swagger
 * /api/scene-generation/{generationId}:
 *   get:
 *     summary: Get generation status (proxy to Scene Generation Service)
 *     tags: [Scene Generation]
 */
router.get(
  '/:generationId',
  asyncHandler(async (req, res) => {
    const result = await sceneGenerationClient.getGenerationStatus(req.params.generationId);
    res.json(result);
  })
);

/**
 * @swagger
 * /api/scene-generation/{generationId}/scenario:
 *   get:
 *     summary: Get scenario for review (proxy to Scene Generation Service)
 *     tags: [Scene Generation]
 */
router.get(
  '/:generationId/scenario',
  asyncHandler(async (req, res) => {
    const result = await sceneGenerationClient.getScenario(req.params.generationId);
    res.json(result);
  })
);

/**
 * @swagger
 * /api/scene-generation/{generationId}/scenario:
 *   put:
 *     summary: Update scenario (proxy to Scene Generation Service)
 *     tags: [Scene Generation]
 */
router.put(
  '/:generationId/scenario',
  validate(updateScenarioSchema),
  asyncHandler(async (req, res) => {
    const result = await sceneGenerationClient.updateScenario(
      req.params.generationId,
      req.body.scenario
    );
    res.json(result);
  })
);

/**
 * @swagger
 * /api/scene-generation/{generationId}:
 *   delete:
 *     summary: Cancel generation (proxy to Scene Generation Service)
 *     tags: [Scene Generation]
 */
router.delete(
  '/:generationId',
  asyncHandler(async (req, res) => {
    const result = await sceneGenerationClient.cancelGeneration(req.params.generationId);
    res.json(result);
  })
);

export default router;

