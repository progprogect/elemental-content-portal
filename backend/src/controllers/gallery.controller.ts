import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createStorageAdapter } from '../storage';

/**
 * Определяет тип медиа по URL или пути файла
 */
function getMediaType(urlOrPath?: string | null): 'image' | 'video' | 'file' | 'audio' {
  if (!urlOrPath) return 'file';
  
  const lower = urlOrPath.toLowerCase();
  
  // Проверка расширения изображений
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)) {
    return 'image';
  }
  
  // Проверка расширения видео
  if (lower.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v)$/i)) {
    return 'video';
  }
  
  // Проверка расширения аудио
  if (lower.match(/\.(mp3|wav|m4a|ogg|flac|webm|aac)$/i)) {
    return 'audio';
  }
  
  return 'file';
}

/**
 * Получает приоритетный URL для медиа
 * Приоритет: assetUrl > downloadUrl > resultUrl
 */
function getMediaUrl(result: {
  assetUrl?: string | null;
  downloadUrl?: string | null;
  resultUrl?: string | null;
}): string | null {
  return result.assetUrl || result.downloadUrl || result.resultUrl || null;
}

export const getGallery = async (req: Request, res: Response) => {
  try {
    const {
      type = 'all',
      source = 'all',
      taskId,
      publicationId,
      dateFrom,
      dateTo,
      page = '1',
      limit = '24',
      sort = 'newest',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 24;
    const skip = (pageNum - 1) * limitNum;

    // Построение условий фильтрации
    const where: any = {};

    // Фильтр по источнику
    if (source !== 'all') {
      where.source = source;
    }

    // Фильтр по задаче
    if (taskId) {
      where.taskId = taskId as string;
    }

    // Фильтр по публикации
    if (publicationId) {
      where.publicationId = publicationId as string;
    }

    // Фильтр по дате
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo as string);
      }
    }

    // Получение результатов и полей с файлами
    // Для JSONB полей в Prisma нужно использовать другой синтаксис
    // Получаем все поля типа 'file' и фильтруем в коде
    const whereFields: any = {
      fieldType: 'file',
    };
    
    if (taskId) {
      whereFields.taskId = taskId;
    }
    
    if (dateFrom || dateTo) {
      whereFields.createdAt = {};
      if (dateFrom) {
        whereFields.createdAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        whereFields.createdAt.lte = new Date(dateTo as string);
      }
    }

    // Получаем все результаты и поля без пагинации (пагинацию применим после объединения)
    const [allResults, allFields, totalResults, totalFields] = await Promise.all([
      prisma.taskResult.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              contentType: true,
            },
          },
          publication: {
            select: {
              id: true,
              platform: true,
              contentType: true,
            },
          },
        },
      }),
      prisma.taskField.findMany({
        where: whereFields,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              contentType: true,
            },
          },
        },
      }),
      prisma.taskResult.count({ where }),
      prisma.taskField.count({ where: whereFields }),
    ]);

    // Преобразование результатов в формат галереи
    const resultItems = allResults
      .map((result) => {
        const mediaUrl = getMediaUrl(result);
        if (!mediaUrl) return null; // Пропускаем результаты без URL

        const mediaType = getMediaType(result.assetPath || result.assetUrl || result.downloadUrl || result.resultUrl);

        // Фильтрация по типу медиа
        if (type !== 'all' && mediaType !== type) {
          return null;
        }

        return {
          id: result.id,
          mediaUrl,
          mediaType,
          filename: result.assetPath
            ? result.assetPath.split('/').pop() || undefined
            : undefined,
          source: result.source as 'manual' | 'haygen' | 'nanobanana' | 'elevenlabs',
          createdAt: result.createdAt.toISOString(),
          task: result.task
            ? {
                id: result.task.id,
                title: result.task.title,
                contentType: result.task.contentType,
              }
            : undefined,
          publication: result.publication
            ? {
                id: result.publication.id,
                platform: result.publication.platform,
                contentType: result.publication.contentType,
              }
            : undefined,
          // Дополнительные поля для действий
          resultUrl: result.resultUrl || undefined,
          downloadUrl: result.downloadUrl || undefined,
          assetPath: result.assetPath || undefined,
          assetUrl: result.assetUrl || undefined,
          itemType: 'result' as const,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Преобразование полей с файлами в формат галереи
    // Фильтруем поля, у которых есть path в fieldValue
    const fieldItems = allFields
      .filter((field) => {
        const fieldValue = field.fieldValue as { path?: string } | null;
        return fieldValue && fieldValue.path;
      })
      .map((field) => {
        const fieldValue = field.fieldValue as { path?: string; url?: string; filename?: string; size?: number };
        
        // Уже отфильтрованы выше, но TypeScript не знает об этом
        if (!fieldValue.path) return null;
        
        const mediaUrl = fieldValue.url || fieldValue.path;
        const mediaType = getMediaType(fieldValue.path);

        // Фильтрация по типу медиа
        if (type !== 'all' && mediaType !== type) {
          return null;
        }

        return {
          id: field.id,
          mediaUrl,
          mediaType,
          filename: fieldValue.filename || fieldValue.path.split('/').pop() || undefined,
          source: 'manual' as const,
          createdAt: field.createdAt.toISOString(),
          task: field.task
            ? {
                id: field.task.id,
                title: field.task.title,
                contentType: field.task.contentType,
              }
            : undefined,
          publication: undefined,
          assetPath: fieldValue.path,
          assetUrl: fieldValue.url || undefined,
          itemType: 'field' as const,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Объединяем и сортируем все элементы
    const allItems = [...resultItems, ...fieldItems];
    
    // Сортируем объединенный список
    allItems.sort((a, b) => {
      if (sort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sort === 'task') {
        const taskCompare = (a.task?.id || '').localeCompare(b.task?.id || '');
        if (taskCompare !== 0) return taskCompare;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    // Применяем пагинацию к объединенному списку
    const items = allItems.slice(skip, skip + limitNum);

    // Если фильтруем по типу медиа, нужно пересчитать total
    // Для точности делаем дополнительный запрос, но только если фильтруем по типу
    let filteredTotal = totalResults + totalFields;
    if (type !== 'all') {
      // Получаем все результаты и поля для подсчета после фильтрации по типу
      const [allResults, allFields] = await Promise.all([
        prisma.taskResult.findMany({
          where,
          select: {
            id: true,
            assetPath: true,
            assetUrl: true,
            downloadUrl: true,
            resultUrl: true,
          },
        }),
        prisma.taskField.findMany({
          where: whereFields,
          select: {
            id: true,
            fieldValue: true,
          },
        }),
      ]);

      const filteredResults = allResults.filter((result) => {
        const mediaUrl = getMediaUrl(result);
        if (!mediaUrl) return false;
        const mediaType = getMediaType(result.assetPath || result.assetUrl || result.downloadUrl || result.resultUrl);
        return mediaType === type;
      });

      const filteredFields = allFields
        .filter((field) => {
          const fieldValue = field.fieldValue as { path?: string } | null;
          return fieldValue && fieldValue.path;
        })
        .filter((field) => {
          const fieldValue = field.fieldValue as { path?: string };
          const mediaType = getMediaType(fieldValue.path);
          return mediaType === type;
        });

      filteredTotal = filteredResults.length + filteredFields.length;
    }

    const totalPages = Math.ceil(filteredTotal / limitNum);

    res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredTotal,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({
      error: 'Failed to fetch gallery items',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete gallery item by ID (works for both standalone and task-linked items)
 */
export const deleteGalleryItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { itemType } = req.query; // 'result' or 'field'

    // Validate itemType
    if (itemType && itemType !== 'result' && itemType !== 'field') {
      return res.status(400).json({
        error: 'Invalid itemType',
        message: 'itemType must be either "result" or "field"',
      });
    }

    if (itemType === 'field') {
      // For fields, we need taskId
      const { taskId } = req.query;
      if (!taskId || typeof taskId !== 'string') {
        return res.status(400).json({
          error: 'Missing taskId',
          message: 'taskId is required for field items',
        });
      }

      const field = await prisma.taskField.findUnique({
        where: { id: itemId, taskId },
      });

      if (!field) {
        return res.status(404).json({ error: 'Field not found' });
      }

      // Delete from storage if it's a file field
      if (field.fieldType === 'file' && field.fieldValue && (field.fieldValue as any).path) {
        try {
          const storage = createStorageAdapter();
          await storage.delete((field.fieldValue as any).path);
        } catch (error) {
          console.error('Storage delete error for TaskField:', error);
        }
      }

      await prisma.taskField.delete({
        where: { id: itemId, taskId },
      });
    } else {
      // For results, try to find by ID (works for both standalone and task-linked)
      const result = await prisma.taskResult.findUnique({
        where: { id: itemId },
      });

      if (!result) {
        return res.status(404).json({ error: 'Result not found' });
      }

      // Delete from storage if assetPath exists
      if (result.assetPath) {
        try {
          const storage = createStorageAdapter();
          await storage.delete(result.assetPath);
        } catch (error) {
          console.error('Storage delete error for TaskResult:', error);
        }
      }

      // Delete from DB (works for both standalone and task-linked)
      await prisma.taskResult.delete({
        where: { id: itemId },
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({
      error: 'Failed to delete gallery item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Add item to gallery without task/publication context (standalone mode)
 * Used for saving standalone generated images to gallery
 */
export const addGalleryItem = async (req: Request, res: Response) => {
  try {
    const { assetUrl, assetPath, source = 'nanobanana' } = req.body;

    // Validate required fields
    if (!assetUrl || !assetPath) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'assetUrl and assetPath are required',
      });
    }

    // Validate source
    const validSources = ['manual', 'haygen', 'nanobanana', 'elevenlabs'];
    if (!validSources.includes(source)) {
      return res.status(400).json({
        error: 'Invalid source',
        message: `Source must be one of: ${validSources.join(', ')}`,
      });
    }

    // Create TaskResult with taskId=null and publicationId=null
    const result = await prisma.taskResult.create({
      data: {
        taskId: null,
        publicationId: null,
        assetUrl,
        assetPath,
        source,
      },
    });

    // Transform to GalleryItem format
    const mediaType = getMediaType(assetPath || assetUrl);
    const mediaUrl = assetUrl;

    const galleryItem = {
      id: result.id,
      mediaUrl,
      mediaType,
      filename: assetPath ? assetPath.split('/').pop() || undefined : undefined,
      source: result.source as 'manual' | 'haygen' | 'nanobanana' | 'elevenlabs',
      createdAt: result.createdAt.toISOString(),
      task: undefined, // No task for standalone items
      publication: undefined, // No publication for standalone items
      assetPath: result.assetPath || undefined,
      assetUrl: result.assetUrl || undefined,
      itemType: 'result' as const,
    };

    res.status(201).json(galleryItem);
  } catch (error) {
    console.error('Error adding gallery item:', error);
    res.status(500).json({
      error: 'Failed to add gallery item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

