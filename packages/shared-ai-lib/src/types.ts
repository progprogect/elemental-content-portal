/**
 * Shared types for AI generation services
 */

export interface ImageGenerationSettings {
  prompt: string;
  stylePreset?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  model?: 'standard' | 'pro';
  customStyle?: string;
  referenceImageUrl?: string; // URL загруженного reference image
  refinementPrompt?: string; // Промпт для доработки (добавляется к основному)
  useCurrentResultAsReference?: boolean; // Флаг для использования текущего результата как reference
}

export interface ImageGenerationResult {
  assetUrl: string;
  assetPath: string;
}

export interface TextGenerationOptions {
  basePrompt: string;
  additionalInstructions?: string;
  tone?: 'casual' | 'professional' | 'engaging' | 'formal';
  length?: 'short' | 'medium' | 'long';
}

export interface SpeechSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  modelId?: string;
}

export interface StorageResult {
  path: string;
  url: string;
  size: number;
}

export interface StorageAdapter {
  upload(file: Buffer, filename: string, path?: string): Promise<StorageResult>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
}

