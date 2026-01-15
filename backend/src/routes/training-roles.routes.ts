import { Router } from 'express';
import * as trainingRolesController from '../controllers/training-roles.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/', asyncHandler(trainingRolesController.getRoles));
router.post('/', asyncHandler(trainingRolesController.createRole));
router.put('/:id', asyncHandler(trainingRolesController.updateRole));
router.delete('/:id', asyncHandler(trainingRolesController.deleteRole));

export default router;







