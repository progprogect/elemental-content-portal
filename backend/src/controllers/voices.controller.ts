import { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { cloneVoice, deleteVoice, getVoices, getVoiceById } from '../services/elevenlabs-service';
import { prisma } from '../utils/prisma';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for voice cloning
  },
  fileFilter: (req, file, cb) => {
    // Allow audio file types
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/webm',
      'audio/ogg',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files (MP3, WAV, M4A) are allowed.'));
    }
  },
});

const cloneVoiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

/**
 * Clone a voice from audio file
 * POST /api/voices/clone
 */
export const cloneVoiceHandler = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    const body = cloneVoiceSchema.parse(req.body);
    const audioBuffer = req.file.buffer;

    // Validate audio file size (should be at least 1 second, roughly 16KB for MP3)
    if (audioBuffer.length < 16000) {
      return res.status(400).json({ 
        error: 'Audio file too short', 
        message: 'Audio file must be at least 1 second long' 
      });
    }

    const voice = await cloneVoice(audioBuffer, body.name, body.description);

    res.status(201).json({
      id: voice.id,
      name: voice.name,
      elevenlabsId: voice.elevenlabsId,
      voiceType: voice.voiceType,
      description: voice.description,
      sampleUrl: voice.sampleUrl,
      createdAt: voice.createdAt,
    });
  } catch (error: any) {
    console.error('Error cloning voice:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    res.status(500).json({
      error: 'Failed to clone voice',
      message: error.message || 'Unknown error',
    });
  }
};

export const cloneVoiceMiddleware = upload.single('audioFile');

/**
 * Get all voices (premium + cloned)
 * GET /api/voices
 */
export const getVoicesHandler = async (req: Request, res: Response) => {
  try {
    const voices = await getVoices();
    res.json({ voices });
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      error: 'Failed to fetch voices',
      message: error.message || 'Unknown error',
    });
  }
};

/**
 * Get voice by ID
 * GET /api/voices/:id
 */
export const getVoiceByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const voice = await getVoiceById(id);

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    res.json(voice);
  } catch (error: any) {
    console.error('Error fetching voice:', error);
    res.status(500).json({
      error: 'Failed to fetch voice',
      message: error.message || 'Unknown error',
    });
  }
};

/**
 * Delete a cloned voice
 * DELETE /api/voices/:id
 */
export const deleteVoiceHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if voice exists and is cloned
    const voice = await prisma.voice.findUnique({
      where: { id },
    });

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    if (voice.voiceType !== 'cloned') {
      return res.status(400).json({ 
        error: 'Cannot delete premium voices',
        message: 'Only cloned voices can be deleted' 
      });
    }

    await deleteVoice(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting voice:', error);
    res.status(500).json({
      error: 'Failed to delete voice',
      message: error.message || 'Unknown error',
    });
  }
};

