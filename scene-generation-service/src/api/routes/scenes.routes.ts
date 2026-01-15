import { Router } from 'express';
import * as scenesController from '../controllers/scenes.controller';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { generateRateLimiter } from '../middleware/rate-limiter';

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
  scenario: z.any(), // JSON object
});

router.post(
  '/generate',
  generateRateLimiter,
  validate(generateRequestSchema),
  asyncHandler(scenesController.generateScenes)
);

router.get(
  '/',
  asyncHandler(scenesController.listGenerations)
);

router.get(
  '/:generationId',
  asyncHandler(scenesController.getGenerationStatus)
);

router.get(
  '/:generationId/scenario',
  asyncHandler(scenesController.getScenario)
);

router.put(
  '/:generationId/scenario',
  validate(updateScenarioSchema),
  asyncHandler(scenesController.updateScenario)
);

router.delete(
  '/:generationId',
  asyncHandler(scenesController.cancelGeneration)
);

router.post(
  '/:generationId/scenes/:sceneId/regenerate',
  asyncHandler(scenesController.regenerateScene)
);

export default router;

