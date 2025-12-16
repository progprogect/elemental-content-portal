import { Router } from 'express';
import * as voicesController from '../controllers/voices.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post(
  '/clone',
  voicesController.cloneVoiceMiddleware,
  asyncHandler(voicesController.cloneVoiceHandler)
);

router.get('/', asyncHandler(voicesController.getVoicesHandler));

router.get('/:id', asyncHandler(voicesController.getVoiceByIdHandler));

router.delete('/:id', asyncHandler(voicesController.deleteVoiceHandler));

export default router;

