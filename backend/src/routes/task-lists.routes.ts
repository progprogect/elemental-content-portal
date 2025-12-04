import { Router } from 'express';
import * as taskListsController from '../controllers/task-lists.controller';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router();

router.get('/', asyncHandler(taskListsController.getTaskLists));
router.get('/:id/stats', asyncHandler(taskListsController.getTaskListStats));
router.post('/', validate(z.object({
  name: z.string().min(1).max(255),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(taskListsController.createTaskList));
router.put('/:id', validate(z.object({
  name: z.string().min(1).max(255).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(taskListsController.updateTaskList));
router.delete('/:id', asyncHandler(taskListsController.deleteTaskList));

export default router;



