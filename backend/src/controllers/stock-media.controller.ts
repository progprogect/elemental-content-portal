import { Request, Response } from 'express';
import { searchStockMedia, downloadStockMedia, StockMediaItem } from '../services/stock-media';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['photo', 'video', 'all']).optional(),
  source: z.enum(['pexels', 'unsplash', 'pixabay', 'all']).optional(),
  orientation: z.enum(['landscape', 'portrait', 'square']).optional(),
  size: z.enum(['large', 'medium', 'small']).optional(),
  color: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  perPage: z.string().regex(/^\d+$/).optional(),
});

/**
 * Search stock media across all sources
 */
export const searchStockMedia = async (req: Request, res: Response) => {
  try {
    const validated = searchSchema.parse(req.query);
    
    const params = {
      query: validated.query,
      type: validated.type || 'all',
      source: validated.source || 'all',
      orientation: validated.orientation,
      size: validated.size,
      color: validated.color,
      page: validated.page ? parseInt(validated.page, 10) : 1,
      perPage: validated.perPage ? parseInt(validated.perPage, 10) : 20,
    };

    const result = await searchStockMedia(params);
    res.json(result);
  } catch (error) {
    console.error('Error searching stock media:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        error: 'Failed to search stock media',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

const downloadSchema = z.object({
  id: z.string(),
  source: z.enum(['pexels', 'unsplash', 'pixabay']),
  type: z.enum(['photo', 'video']),
  url: z.string().url(),
  downloadUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  photographer: z.string().optional(),
  photographerUrl: z.string().url().optional(),
  duration: z.number().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/**
 * Download stock media and add to gallery
 */
export const downloadAndAddToGallery = async (req: Request, res: Response) => {
  try {
    const validated = downloadSchema.parse(req.body);

    const stockItem: StockMediaItem = {
      id: validated.id,
      source: validated.source,
      type: validated.type,
      url: validated.url,
      downloadUrl: validated.downloadUrl,
      thumbnailUrl: validated.thumbnailUrl,
      width: validated.width,
      height: validated.height,
      photographer: validated.photographer,
      photographerUrl: validated.photographerUrl,
      duration: validated.duration,
      tags: validated.tags,
      description: validated.description,
    };

    // Download and upload to storage
    const { url, path, filename } = await downloadStockMedia(stockItem);

    // Add to gallery as TaskResult (standalone)
    const result = await prisma.taskResult.create({
      data: {
        taskId: null,
        publicationId: null,
        assetUrl: url,
        assetPath: path,
        source: 'manual', // Stock media is considered manual
      },
    });

    res.status(201).json({
      id: result.id,
      mediaUrl: url,
      assetPath: path,
      filename,
      source: 'manual',
      createdAt: result.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error downloading stock media:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request body',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        error: 'Failed to download stock media',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

