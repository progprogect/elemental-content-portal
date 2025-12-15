import { Router, Request, Response, NextFunction } from 'express';
import * as galleryController from '../controllers/gallery.controller';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const router = Router();

// Схема валидации query параметров
const galleryQuerySchema = z.object({
  type: z.enum(['all', 'image', 'video']).optional(),
  source: z.enum(['all', 'manual', 'haygen', 'nanobanana']).optional(),
  taskId: z.string().uuid().optional(),
  publicationId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  sort: z.enum(['newest', 'oldest', 'task']).optional(),
});

// Middleware для валидации query параметров
const validateQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    galleryQuerySchema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    } else {
      next(error);
    }
  }
};

router.get('/', validateQuery, asyncHandler(galleryController.getGallery));

export default router;

