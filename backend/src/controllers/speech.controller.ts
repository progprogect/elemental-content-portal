import { Request, Response } from 'express';
import multer from 'multer';
import { transcribeAudio } from '../services/speech-to-text';

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

