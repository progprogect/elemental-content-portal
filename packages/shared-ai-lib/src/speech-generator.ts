/**
 * Generates speech from text using ElevenLabs API
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { SpeechSettings } from './types';
import { AIConfig } from './config';

/**
 * Generates speech from text using ElevenLabs API
 * @param text Text to convert to speech
 * @param elevenlabsVoiceId ElevenLabs voice ID (direct ID, not our internal voice ID)
 * @param settings Optional speech generation settings
 * @param config Optional AI configuration. If not provided, reads from process.env
 * @returns Audio buffer
 */
export async function generateSpeech(
  text: string,
  elevenlabsVoiceId: string,
  settings: SpeechSettings = {},
  config?: AIConfig
): Promise<Buffer> {
  // Get API key from config or environment variables
  const apiKey = config?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key is not configured. Provide elevenlabsApiKey in config or set ELEVENLABS_API_KEY environment variable');
  }

  const client = new ElevenLabsClient({
    apiKey: apiKey,
  });

  try {
    console.log('Generating speech with voice:', {
      elevenlabsVoiceId,
    });

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

