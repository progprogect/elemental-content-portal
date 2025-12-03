import { Router } from 'express';
import * as fieldTemplatesController from '../controllers/field-templates.controller';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router();

router.get('/', asyncHandler(fieldTemplatesController.getFieldTemplates));
router.get('/:id', asyncHandler(fieldTemplatesController.getFieldTemplate));
router.post('/', validate(z.object({
  fieldName: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(fieldTemplatesController.createFieldTemplate));
router.put('/:id', validate(z.object({
  fieldName: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'file', 'url', 'checkbox']).optional(),
  defaultValue: z.any().optional(),
  icon: z.string().max(50).optional(),
  orderIndex: z.number().int().optional(),
})), asyncHandler(fieldTemplatesController.updateFieldTemplate));
router.delete('/:id', asyncHandler(fieldTemplatesController.deleteFieldTemplate));

export default router;

export default router;

