import { Router } from 'express';
import * as fieldsController from '../controllers/fields.controller';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router({ mergeParams: true });

router.post('/', validate(z.object({
  fieldName: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']),
  fieldValue: z.any(),
  orderIndex: z.number().int().optional(),
})), fieldsController.addField);
router.put('/:fieldId', validate(z.object({
  fieldName: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']).optional(),
  fieldValue: z.any().optional(),
  orderIndex: z.number().int().optional(),
})), fieldsController.updateField);
router.delete('/:fieldId', fieldsController.deleteField);
router.patch('/reorder', validate(z.object({
  fieldIds: z.array(z.string().uuid()),
})), fieldsController.reorderFields);

export default router;

