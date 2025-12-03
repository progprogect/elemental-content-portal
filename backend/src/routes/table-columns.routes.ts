import { Router } from 'express';
import * as tableColumnsController from '../controllers/table-columns.controller';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router();

router.get('/', asyncHandler(tableColumnsController.getTableColumns));
router.get('/:id', asyncHandler(tableColumnsController.getTableColumn));
router.post('/', validate(z.object({
  fieldName: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(tableColumnsController.createTableColumn));
router.put('/:id', validate(z.object({
  fieldName: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']).optional(),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(tableColumnsController.updateTableColumn));
router.delete('/:id', asyncHandler(tableColumnsController.deleteTableColumn));

export default router;

