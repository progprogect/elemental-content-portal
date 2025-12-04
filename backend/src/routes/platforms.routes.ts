import { Router } from 'express';
import * as platformsController from '../controllers/platforms.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/', asyncHandler(platformsController.getPlatforms));

export default router;


