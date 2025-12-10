import { Router } from 'express';
import * as trainingAssetsController from '../controllers/training-assets.controller';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router = Router({ mergeParams: true });

const addLinkSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional(),
  assetType: z.enum(['video', 'presentation']).default('presentation'),
});

router.get('/', asyncHandler(trainingAssetsController.getAssets));
router.post('/', trainingAssetsController.uploadMiddleware, asyncHandler(trainingAssetsController.uploadAsset));
router.post('/presentation', trainingAssetsController.uploadPresentationMiddleware, asyncHandler(trainingAssetsController.uploadPresentation));
router.post('/link', validate(addLinkSchema), asyncHandler(trainingAssetsController.addAssetLink));
router.delete('/:id', asyncHandler(trainingAssetsController.deleteAsset));

export default router;

