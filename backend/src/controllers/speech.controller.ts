import { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { transcribeAudio } from '../services/speech-to-text';
import { generateSpeech, SpeechSettings } from '../services/elevenlabs-service';
import { createStorageAdapter } from '../storage';
import { prisma } from '../utils/prisma';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB - Whisper API limit
  },
  fileFilter: (req, file, cb) => {
    // Allow audio file types
    const allowedTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/ogg',
      'audio/flac',
      'audio/m4a',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

export const transcribeAudioHandler = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    // Transcribe audio
    const transcribedText = await transcribeAudio(
      req.file.buffer,
      req.file.originalname || 'audio.webm',
      req.file.mimetype || 'audio/webm'
    );

    res.json({
      text: transcribedText,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message || 'Unknown error',
    });
  }
};

export const transcribeMiddleware = upload.single('audio');

const generatePreviewSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1),
  settings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    useSpeakerBoost: z.boolean().optional(),
    modelId: z.string().optional(),
  }).optional(),
});

const saveResultSchema = z.object({
  audioUrl: z.string().url(),
  audioPath: z.string(),
  taskId: z.string().uuid().optional(),
  publicationId: z.string().uuid().optional(),
});

/**
 * Generate speech preview (without saving to database)
 * POST /api/speech/generate-preview
 */
export const generatePreviewHandler = async (req: Request, res: Response) => {
  try {
    const data = generatePreviewSchema.parse(req.body);
    
    // Generate speech
    const audioBuffer = await generateSpeech(
      data.text,
      data.voiceId,
      data.settings as SpeechSettings
    );

    // Save to temporary storage
    const storage = createStorageAdapter();
    const filename = `speech-preview-${Date.now()}.mp3`;
    const storagePath = `speech/previews`;
    
    const result = await storage.upload(audioBuffer, filename, storagePath);

    // Validate that we got valid URL and path
    if (!result.url || !result.path) {
      throw new Error('Failed to upload audio: missing URL or path');
    }

    res.json({
      audioUrl: result.url,
      audioPath: result.path,
    });
  } catch (error: any) {
    console.error('Error generating speech preview:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    res.status(500).json({
      error: 'Failed to generate speech preview',
      message: error.message || 'Unknown error',
    });
  }
};

/**
 * Save speech result to gallery/publication
 * POST /api/speech/save-result
 */
export const saveResultHandler = async (req: Request, res: Response) => {
  try {
    const data = saveResultSchema.parse(req.body);

    // Verify task exists if taskId is provided
    if (data.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: data.taskId },
      });
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
    }

    // Verify publication exists if publicationId is provided
    if (data.publicationId) {
      const publication = await prisma.taskPublication.findUnique({
        where: { id: data.publicationId },
      });
      if (!publication) {
        return res.status(404).json({ error: 'Publication not found' });
      }
      
      // If taskId is also provided, verify publication belongs to task
      if (data.taskId && publication.taskId !== data.taskId) {
        return res.status(400).json({ 
          error: 'Publication does not belong to task' 
        });
      }
    }

    // Create result record
    const result = await prisma.taskResult.create({
      data: {
        taskId: data.taskId || null,
        publicationId: data.publicationId || null,
        assetUrl: data.audioUrl,
        assetPath: data.audioPath,
        source: 'elevenlabs',
      },
    });

    // Update publication status if publicationId is provided
    if (data.publicationId) {
      await prisma.taskPublication.update({
        where: { id: data.publicationId },
        data: {
          status: 'completed',
          executionType: 'generated',
        },
      });

      // Check if all publications are completed to update task status
      if (data.taskId) {
        const allPublications = await prisma.taskPublication.findMany({
          where: { taskId: data.taskId },
        });

        if (allPublications.length > 0) {
          const allCompleted = allPublications.every(p => p.status === 'completed');
          if (allCompleted) {
            await prisma.task.update({
              where: { id: data.taskId },
              data: {
                status: 'completed',
                executionType: 'generated',
              },
            });
          }
        }
      }
    }

    res.status(201).json({
      id: result.id,
      assetUrl: result.assetUrl,
      assetPath: result.assetPath,
      source: result.source,
    });
  } catch (error: any) {
    console.error('Error saving speech result:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    res.status(500).json({
      error: 'Failed to save speech result',
      message: error.message || 'Unknown error',
    });
  }
};

