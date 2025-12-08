import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import * as imagesController from '../controllers/images.controller';

const router = Router();

const generateImageSchema = z.object({
  prompt: z.string().min(1).max(2000),
  stylePreset: z.string().optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
  customStyle: z.string().optional(),
});

router.post(
  '/generate-image',
  validate(generateImageSchema),
  asyncHandler(imagesController.generateImageForPublication)
);

export default router;

