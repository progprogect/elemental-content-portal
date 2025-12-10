import { Router } from 'express';
import * as trainingTestsController from '../controllers/training-tests.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(trainingTestsController.getTest));
router.post('/generate', asyncHandler(trainingTestsController.generateTest));
router.put('/:id', asyncHandler(trainingTestsController.updateTest));

export default router;

