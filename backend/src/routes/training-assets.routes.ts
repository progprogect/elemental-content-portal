import { Router } from 'express';
import * as trainingAssetsController from '../controllers/training-assets.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(trainingAssetsController.getAssets));
router.post('/', trainingAssetsController.uploadMiddleware, asyncHandler(trainingAssetsController.uploadAsset));
router.delete('/:id', asyncHandler(trainingAssetsController.deleteAsset));

export default router;

