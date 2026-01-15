/**
 * Configuration interfaces for AI services
 */

export interface AIConfig {
  /** Google Gemini API key for image and text generation */
  googleApiKey?: string;
  /** OpenAI API key for Whisper transcription */
  openaiApiKey?: string;
  /** ElevenLabs API key for speech generation */
  elevenlabsApiKey?: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface StorageConfig {
  provider: 'cloudinary' | 'r2' | 's3';
  cloudinary?: CloudinaryConfig;
  r2?: R2Config;
  s3?: S3Config;
}

