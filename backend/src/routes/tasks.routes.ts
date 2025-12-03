import { Router } from 'express';
import * as tasksController from '../controllers/tasks.controller';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router();

router.get('/', asyncHandler(tasksController.getTasks));
router.get('/:id', asyncHandler(tasksController.getTask));
router.post('/', validate(z.object({
  title: z.string().min(1).max(500),
  contentType: z.string().min(1).max(50),
  executionType: z.enum(['manual', 'generated']).optional(),
})), asyncHandler(tasksController.createTask));
router.put('/:id', validate(z.object({
  title: z.string().min(1).max(500).optional(),
  contentType: z.string().min(1).max(50).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed']).optional(),
  executionType: z.enum(['manual', 'generated']).optional(),
})), asyncHandler(tasksController.updateTask));
router.delete('/:id', asyncHandler(tasksController.deleteTask));

export default router;

