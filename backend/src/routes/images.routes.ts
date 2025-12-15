import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import * as imagesController from '../controllers/images.controller';

const router = Router({ mergeParams: true }); // mergeParams needed to access :taskId and :publicationId from parent route

const generateImageSchema = z.object({
  prompt: z.string().min(1).max(2000),
  stylePreset: z.string().optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
  customStyle: z.string().optional(),
  referenceImageUrl: z.string().url().optional(),
  refinementPrompt: z.string().max(1000).optional(),
  useCurrentResultAsReference: z.boolean().optional(),
});

const saveResultSchema = z.object({
  assetUrl: z.string().url(),
  assetPath: z.string().min(1),
});

router.post(
  '/generate-image',
  validate(generateImageSchema),
  asyncHandler(imagesController.generateImageForPublication)
);

router.post(
  '/generate-image-preview',
  validate(generateImageSchema),
  asyncHandler(imagesController.generateImagePreview)
);

router.post(
  '/save-image-result',
  validate(saveResultSchema),
  asyncHandler(imagesController.saveImageResult)
);

export default router;

