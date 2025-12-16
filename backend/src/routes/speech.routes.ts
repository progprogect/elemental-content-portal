import { Router } from 'express';
import * as speechController from '../controllers/speech.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post('/transcribe', speechController.transcribeMiddleware, asyncHandler(speechController.transcribeAudioHandler));

router.post('/generate-preview', asyncHandler(speechController.generatePreviewHandler));

router.post('/save-result', asyncHandler(speechController.saveResultHandler));

export default router;

