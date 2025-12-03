import { Router } from 'express';
import * as resultsController from '../controllers/results.controller';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(resultsController.getResults));
router.post('/', validate(z.object({
  resultUrl: z.union([z.string().url(), z.literal('')]).optional(),
  downloadUrl: z.union([z.string().url(), z.literal('')]).optional(),
  assetPath: z.string().optional(),
  assetUrl: z.union([z.string().url(), z.literal('')]).optional(),
  source: z.enum(['manual', 'haygen', 'nanobanana']).optional(),
  publicationId: z.string().uuid().optional().nullable(),
})), asyncHandler(resultsController.addResult));
router.delete('/:resultId', asyncHandler(resultsController.deleteResult));

export default router;

