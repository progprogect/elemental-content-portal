# Shared AI Library

Shared library for AI generation functions: image generation, text generation, speech synthesis, and transcription.

## Installation

```bash
npm install @elemental-content/shared-ai-lib
```

## Usage

### Image Generation

```typescript
import { generateImage, ImageGenerationSettings } from '@elemental-content/shared-ai-lib';

const settings: ImageGenerationSettings = {
  prompt: 'A beautiful sunset over mountains',
  aspectRatio: '16:9',
  stylePreset: 'photo-realistic'
};

// With environment variables (backward compatible)
const result = await generateImage(settings, {
  taskId: 'task-123',
  publicationId: 'pub-456'
});

// With explicit configuration
const result = await generateImage(settings, {
  config: { googleApiKey: 'your-api-key' },
  storage: storageAdapter,
  taskId: 'task-123',
  publicationId: 'pub-456'
});
```

### Text Generation

```typescript
import { generateText, TextGenerationOptions } from '@elemental-content/shared-ai-lib';

const options: TextGenerationOptions = {
  basePrompt: 'Write about artificial intelligence',
  tone: 'professional',
  length: 'medium'
};

// With environment variables
const text = await generateText(options);

// With explicit configuration
const text = await generateText(options, {
  googleApiKey: 'your-api-key'
});
```

### Speech Generation

```typescript
import { generateSpeech, SpeechSettings } from '@elemental-content/shared-ai-lib';

const settings: SpeechSettings = {
  stability: 0.5,
  similarityBoost: 0.75
};

// With environment variables
const audioBuffer = await generateSpeech(
  'Hello, world!',
  'elevenlabs-voice-id',
  settings
);

// With explicit configuration
const audioBuffer = await generateSpeech(
  'Hello, world!',
  'elevenlabs-voice-id',
  settings,
  { elevenlabsApiKey: 'your-api-key' }
);
```

### Speech to Text (Transcription)

```typescript
import { transcribeAudio } from '@elemental-content/shared-ai-lib';

// With environment variables
const text = await transcribeAudio(
  audioBuffer,
  'audio.webm',
  'audio/webm'
);

// With explicit configuration
const text = await transcribeAudio(
  audioBuffer,
  'audio.webm',
  'audio/webm',
  { openaiApiKey: 'your-api-key' }
);
```

### Storage

```typescript
import { createStorageAdapter, StorageConfig } from '@elemental-content/shared-ai-lib';

// With environment variables
const storage = createStorageAdapter();

// With explicit configuration
const storageConfig: StorageConfig = {
  provider: 'r2',
  r2: {
    accountId: 'your-account-id',
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
    bucketName: 'your-bucket',
    publicUrl: 'https://your-bucket.r2.dev'
  }
};
const storage = createStorageAdapter(storageConfig);
```

## Configuration

All functions support dependency injection through optional configuration parameters. If not provided, they fall back to environment variables for backward compatibility.

### Environment Variables

- `NANOBANANA_API_KEY` or `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY` - Google Gemini API key
- `OPENAI_KEY` - OpenAI API key for Whisper
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `STORAGE_PROVIDER` - Storage provider: `cloudinary`, `r2`, or `s3`
- Storage-specific environment variables (see storage adapters)

## Architecture

The library uses dependency injection pattern for maximum flexibility:

1. **Configuration Injection**: Pass `AIConfig` or `StorageConfig` objects
2. **Dependency Injection**: Pass `StorageAdapter` instances directly
3. **Environment Fallback**: Falls back to `process.env` if config not provided

This allows the library to be used in different contexts:
- As a shared library in monorepo
- As an npm package
- With custom configuration management systems

## Types

All types are exported from the main entry point:

```typescript
import {
  ImageGenerationSettings,
  ImageGenerationResult,
  TextGenerationOptions,
  SpeechSettings,
  StorageAdapter,
  StorageResult,
  AIConfig,
  StorageConfig
} from '@elemental-content/shared-ai-lib';
```

