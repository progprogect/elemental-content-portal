import { Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../utils/prisma';
import { createStorageAdapter } from '../storage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    // Allow video files
    const allowedTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

export const uploadMiddleware = upload.single('file');

export const getAssets = async (req: Request, res: Response) => {
  const { topicId } = req.params;

  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const assets = await prisma.trainingAsset.findMany({
    where: { topicId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(assets);
};

export const uploadAsset = async (req: Request, res: Response) => {
  const { topicId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  try {
    const storage = createStorageAdapter();
    // Sanitize filename to prevent path traversal
    const sanitizedOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${sanitizedOriginalName}`;
    const path = `training-assets/${topicId}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const result = await storage.upload(req.file.buffer, filename, path);

    const asset = await prisma.trainingAsset.create({
      data: {
        topicId,
        assetPath: result.path,
        assetUrl: result.url,
        filename: req.file.originalname,
        size: result.size,
        source: 'manual',
      },
    });

    res.status(201).json(asset);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  const { id } = req.params;

  const asset = await prisma.trainingAsset.findUnique({
    where: { id },
  });

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Delete from storage if path exists
  if (asset.assetPath) {
    try {
      const storage = createStorageAdapter();
      await storage.delete(asset.assetPath);
    } catch (error) {
      console.error('Storage delete error:', error);
      // Continue with DB deletion even if storage deletion fails
    }
  }

  await prisma.trainingAsset.delete({
    where: { id },
  });

  res.status(204).send();
};

