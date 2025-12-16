import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { prisma } from '../utils/prisma';

const apiKey = process.env.ELEVENLABS_API_KEY;

if (!apiKey) {
  throw new Error('ELEVENLABS_API_KEY is not configured');
}

const client = new ElevenLabsClient({
  apiKey: apiKey,
});

export interface SpeechSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  modelId?: string;
}

export interface Voice {
  id: string;
  name: string;
  elevenlabsId?: string | null;
  voiceType: 'cloned' | 'premium';
  description?: string | null;
  sampleUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all voices (premium + cloned from database)
 */
export async function getVoices(): Promise<Voice[]> {
  try {
    // Get premium voices from ElevenLabs API
    const apiVoicesResponse: any = await client.voices.getAll();
    const apiVoices = apiVoicesResponse.voices || [];
    
    // Get cloned voices from database
    const clonedVoices = await prisma.voice.findMany({
      where: { voiceType: 'cloned' },
      orderBy: { createdAt: 'desc' },
    });

    // Transform API voices to our format
    const premiumVoices: Voice[] = apiVoices.map((voice: any) => ({
      id: voice.voice_id || voice.id,
      name: voice.name,
      elevenlabsId: voice.voice_id || voice.id,
      voiceType: 'premium' as const,
      description: voice.description || null,
      sampleUrl: null, // Premium voices don't have sample URLs in our DB
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Combine and return (clonedVoices already have correct type from Prisma)
    return [...premiumVoices, ...clonedVoices] as Voice[];
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    throw new Error(`Failed to fetch voices: ${error.message}`);
  }
}

/**
 * Get voice by ID (checks both API and database)
 */
export async function getVoiceById(voiceId: string): Promise<Voice | null> {
  try {
    // First check database for cloned voice
    const clonedVoice = await prisma.voice.findFirst({
      where: {
        OR: [
          { id: voiceId },
          { elevenlabsId: voiceId },
        ],
      },
    });

    if (clonedVoice) {
      return clonedVoice as Voice;
    }

    // If not found in DB, check API for premium voice
    try {
      const apiVoice: any = await client.voices.get(voiceId);
      return {
        id: apiVoice.voice_id || apiVoice.id || voiceId,
        name: apiVoice.name,
        elevenlabsId: apiVoice.voice_id || apiVoice.id || voiceId,
        voiceType: 'premium' as const,
        description: apiVoice.description || null,
        sampleUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch {
      return null;
    }
  } catch (error: any) {
    console.error('Error fetching voice:', error);
    throw new Error(`Failed to fetch voice: ${error.message}`);
  }
}

/**
 * Clone a voice from audio file
 */
export async function cloneVoice(
  audioBuffer: Buffer,
  name: string,
  description?: string
): Promise<Voice> {
  try {
    // Clone voice using ElevenLabs API
    // Try different method names as API might vary
    let clonedVoice: any;
    try {
      clonedVoice = await (client.voices as any).add({
        name,
        description: description || undefined,
        files: [
          {
            file: audioBuffer,
            fileName: 'voice-sample.mp3',
          },
        ],
      });
    } catch (addError: any) {
      // Try alternative method name
      try {
        clonedVoice = await (client.voices as any).create({
          name,
          description: description || undefined,
          files: [
            {
              file: audioBuffer,
              fileName: 'voice-sample.mp3',
            },
          ],
        });
      } catch {
        throw addError;
      }
    }

    // Save to database
    const voiceId = clonedVoice.voice_id || clonedVoice.id || clonedVoice.voiceId;
    if (!voiceId) {
      throw new Error('Failed to get voice ID from ElevenLabs response');
    }

    const voice = await prisma.voice.create({
      data: {
        name,
        elevenlabsId: voiceId,
        voiceType: 'cloned',
        description: description || null,
        sampleUrl: null, // Can be added later if needed
      },
    });

    return voice as Voice;
  } catch (error: any) {
    console.error('Error cloning voice:', error);
    throw new Error(`Failed to clone voice: ${error.message}`);
  }
}

/**
 * Delete a cloned voice
 */
export async function deleteVoice(voiceId: string): Promise<void> {
  try {
    // Get voice from database
    const voice = await prisma.voice.findUnique({
      where: { id: voiceId },
    });

    if (!voice) {
      throw new Error('Voice not found');
    }

    if (voice.voiceType !== 'cloned') {
      throw new Error('Cannot delete premium voices');
    }

    if (!voice.elevenlabsId) {
      throw new Error('Voice does not have ElevenLabs ID');
    }

    // Delete from ElevenLabs API
    await client.voices.delete(voice.elevenlabsId);

    // Delete from database
    await prisma.voice.delete({
      where: { id: voiceId },
    });
  } catch (error: any) {
    console.error('Error deleting voice:', error);
    throw new Error(`Failed to delete voice: ${error.message}`);
  }
}

/**
 * Generate speech from text
 */
export async function generateSpeech(
  text: string,
  voiceId: string,
  settings: SpeechSettings = {}
): Promise<Buffer> {
  try {
    // Get voice to determine if it's cloned or premium
    const voice = await getVoiceById(voiceId);
    
    if (!voice) {
      throw new Error('Voice not found');
    }

    // Use the ElevenLabs voice ID (either from API or cloned)
    const elevenlabsVoiceId = voice.elevenlabsId || voice.id;

    // Default settings
    const defaultSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      model_id: 'eleven_multilingual_v2',
    };

    // Merge with provided settings
    const finalSettings = {
      stability: settings.stability ?? defaultSettings.stability,
      similarity_boost: settings.similarityBoost ?? defaultSettings.similarity_boost,
      style: settings.style ?? defaultSettings.style,
      use_speaker_boost: settings.useSpeakerBoost ?? defaultSettings.use_speaker_boost,
      model_id: settings.modelId || defaultSettings.model_id,
    };

    // Generate speech
    // Try both camelCase and snake_case parameter names as API might vary
    let audioStream: any;
    try {
      audioStream = await client.textToSpeech.convert(elevenlabsVoiceId, {
        text,
        modelId: finalSettings.model_id,
        voiceSettings: {
          stability: finalSettings.stability,
          similarityBoost: finalSettings.similarity_boost,
          style: finalSettings.style,
          useSpeakerBoost: finalSettings.use_speaker_boost,
        },
      } as any);
    } catch (error: any) {
      // Try with snake_case if camelCase fails
      try {
        audioStream = await (client.textToSpeech as any).convert(elevenlabsVoiceId, {
          text,
          model_id: finalSettings.model_id,
          voice_settings: {
            stability: finalSettings.stability,
            similarity_boost: finalSettings.similarity_boost,
            style: finalSettings.style,
            use_speaker_boost: finalSettings.use_speaker_boost,
          },
        });
      } catch {
        throw error;
      }
    }

    // Convert stream to buffer
    // Handle both ReadableStream and async iterable
    const chunks: Uint8Array[] = [];
    
    if (audioStream && typeof audioStream[Symbol.asyncIterator] === 'function') {
      // Async iterable
      for await (const chunk of audioStream) {
        chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
      }
    } else if (audioStream && typeof audioStream.getReader === 'function') {
      // ReadableStream
      const reader = audioStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value instanceof Uint8Array ? value : new Uint8Array(value));
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Try to convert to array if it's already a buffer or array
      if (audioStream instanceof Buffer) {
        return audioStream;
      }
      if (Array.isArray(audioStream)) {
        return Buffer.concat(audioStream.map(chunk => chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)));
      }
      throw new Error('Unexpected audio stream format');
    }

    const buffer = Buffer.concat(chunks);
    return buffer;
  } catch (error: any) {
    console.error('Error generating speech:', error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

