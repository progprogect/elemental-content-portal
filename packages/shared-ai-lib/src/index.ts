/**
 * Shared AI Library
 * 
 * This library provides AI generation functions for images, text, speech, and transcription.
 * It can be used in multiple projects with dependency injection support.
 */

// Types
export * from './types';

// Configuration
export * from './config';

// Services
export { generateImage, buildImagePrompt } from './image-generator';
export { generateText } from './text-generator';
export { transcribeAudio } from './speech-to-text';
export { generateSpeech } from './speech-generator';

// Storage
export * from './storage';

