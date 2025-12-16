import { Router } from 'express';
import * as speechController from '../controllers/speech.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post('/transcribe', speechController.transcribeMiddleware, asyncHandler(speechController.transcribeAudioHandler));

export default router;

