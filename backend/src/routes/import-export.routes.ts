import { Router } from 'express';
import * as importExportController from '../controllers/import-export.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/export', asyncHandler(importExportController.exportTasksHandler));
router.get('/template', asyncHandler(importExportController.downloadTemplateHandler));
router.post('/import', importExportController.importMiddleware, asyncHandler(importExportController.importTasksHandler));

export default router;

