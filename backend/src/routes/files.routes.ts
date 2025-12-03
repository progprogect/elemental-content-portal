import { Router } from 'express';
import * as filesController from '../controllers/files.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post('/upload', filesController.uploadMiddleware, asyncHandler(filesController.uploadFile));

export default router;

