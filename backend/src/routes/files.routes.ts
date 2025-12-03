import { Router } from 'express';
import * as filesController from '../controllers/files.controller';

const router = Router();

router.post('/upload', filesController.uploadMiddleware, filesController.uploadFile);

export default router;

