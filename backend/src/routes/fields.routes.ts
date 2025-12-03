import { Router } from 'express';
import * as fieldsController from '../controllers/fields.controller';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router({ mergeParams: true });

router.post('/', validate(z.object({
  fieldName: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']),
  fieldValue: z.any(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(fieldsController.addField));
router.put('/:fieldId', validate(z.object({
  fieldName: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']).optional(),
  fieldValue: z.any().optional(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(fieldsController.updateField));
router.delete('/:fieldId', asyncHandler(fieldsController.deleteField));
router.patch('/reorder', validate(z.object({
  fieldIds: z.array(z.string().uuid()),
})), asyncHandler(fieldsController.reorderFields));

export default router;

