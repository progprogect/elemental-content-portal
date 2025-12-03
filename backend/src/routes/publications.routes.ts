import { Router } from 'express';
import * as publicationsController from '../controllers/publications.controller';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const createPublicationSchema = z.object({
  platform: z.string().min(1).max(50),
  contentType: z.string().min(1).max(50),
  executionType: z.enum(['manual', 'generated']).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed']).optional(),
  note: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  orderIndex: z.number().int().optional(),
});

const updatePublicationSchema = z.object({
  platform: z.string().min(1).max(50).optional(),
  contentType: z.string().min(1).max(50).optional(),
  executionType: z.enum(['manual', 'generated']).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed']).optional(),
  note: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  orderIndex: z.number().int().optional(),
});

router.get('/', asyncHandler(publicationsController.getPublications));
router.post('/', validate(createPublicationSchema), asyncHandler(publicationsController.createPublication));
router.put('/:publicationId', validate(updatePublicationSchema), asyncHandler(publicationsController.updatePublication));
router.delete('/:publicationId', asyncHandler(publicationsController.deletePublication));

export default router;

