import { Router } from 'express';
import * as resultsController from '../controllers/results.controller';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router({ mergeParams: true });

router.get('/', resultsController.getResults);
router.post('/', validate(z.object({
  resultUrl: z.union([z.string().url(), z.literal('')]).optional(),
  downloadUrl: z.union([z.string().url(), z.literal('')]).optional(),
  assetPath: z.string().optional(),
  assetUrl: z.union([z.string().url(), z.literal('')]).optional(),
  source: z.enum(['manual', 'haygen', 'nanobanana']).optional(),
})), resultsController.addResult);
router.delete('/:resultId', resultsController.deleteResult);

export default router;

