import { Router } from 'express';
import * as stockMediaController from '../controllers/stock-media.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/search', asyncHandler(stockMediaController.searchStockMedia));
router.post('/download', asyncHandler(stockMediaController.downloadAndAddToGallery));

export default router;

