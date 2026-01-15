import { GenerationRequest, EnrichedContext } from '../types/scene-generation';
import { createStorageAdapter, transcribeAudio, analyzeImage } from '@elemental-content/shared-ai-lib';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';
import { emitProgress } from '../websocket/scene-generation-socket';
import { extractVideoMetadataFromStorage, extractAudio } from '../utils/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Phase 0: Resource Understanding (Context Enrichment)
 * Analyzes videos, images, and references to create enriched context for LLM
 */
export async function phase0ResourceUnderstanding(
  generationId: string,
  request: GenerationRequest
): Promise<EnrichedContext> {
  logger.info({ generationId }, 'Starting Phase 0: Resource Understanding');

  const enrichedContext: EnrichedContext = {
    prompt: request.prompt,
    videoTranscripts: {},
    videoMetadata: {},
    imageCaptions: {},
    referenceNotes: '',
  };

  const storage = createStorageAdapter();

  try {
    // Update status
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        phase: 'phase0',
        status: 'processing',
        progress: 10,
      },
    });

    // Process videos
    if (request.videos && request.videos.length > 0) {
      logger.info({ generationId, videoCount: request.videos.length }, 'Processing videos');
      
      for (let i = 0; i < request.videos.length; i++) {
        const video = request.videos[i];
        const progress = 10 + Math.floor((i / request.videos.length) * 40);

        try {
          // Extract video metadata using FFmpeg
          try {
            const metadata = await extractVideoMetadataFromStorage(video.path);
            enrichedContext.videoMetadata[video.id] = {
              duration: metadata.duration,
              fps: metadata.fps,
              width: metadata.width,
              height: metadata.height,
            };
            logger.info({ videoId: video.id, metadata }, 'Extracted video metadata');
          } catch (ffmpegError: any) {
            logger.warn({ error: ffmpegError, videoId: video.id }, 'Failed to extract video metadata, using defaults');
            // Fallback to default metadata
            enrichedContext.videoMetadata[video.id] = {
              duration: 0,
              fps: 30,
              width: 1920,
              height: 1080,
            };
          }

          // Transcribe audio if video has audio track
          try {
            const tempDir = path.join(os.tmpdir(), `transcription-${generationId}`);
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const videoBuffer = await storage.download(video.path);
            const tempVideoPath = path.join(tempDir, `video-${video.id}.mp4`);
            fs.writeFileSync(tempVideoPath, videoBuffer);

            const tempAudioPath = path.join(tempDir, `audio-${video.id}.wav`);
            await extractAudio(tempVideoPath, tempAudioPath);

            const audioBuffer = fs.readFileSync(tempAudioPath);
            const transcript = await transcribeAudio(audioBuffer, `${video.id}.wav`, 'audio/wav');
            enrichedContext.videoTranscripts[video.id] = transcript;
            logger.info({ videoId: video.id }, 'Transcribed video audio');

            // Cleanup temp files
            [tempVideoPath, tempAudioPath].forEach((file) => {
              if (fs.existsSync(file)) {
                fs.unlinkSync(file);
              }
            });
          } catch (transcriptionError: any) {
            logger.warn({ error: transcriptionError, videoId: video.id }, 'Failed to transcribe video audio, skipping');
            // Continue without transcript
          }

          await prisma.sceneGeneration.update({
            where: { id: generationId },
            data: { progress },
          });
        } catch (error: any) {
          logger.error({ error, videoId: video.id }, 'Failed to process video');
          // Continue with other videos
        }
      }
    }

    // Process images
    if (request.images && request.images.length > 0) {
      logger.info({ generationId, imageCount: request.images.length }, 'Processing images');
      
      for (let i = 0; i < request.images.length; i++) {
        const image = request.images[i];
        const progress = 50 + Math.floor((i / request.images.length) * 30);

        try {
          // Download image
          const imageBuffer = await storage.download(image.path);
          
          // Use vision model to generate captions
          try {
            const analysis = await analyzeImage(
              imageBuffer,
              'Describe this image in detail, including objects, style, colors, and composition. Focus on elements that would be useful for video generation.',
            );
            enrichedContext.imageCaptions[image.id] = analysis.description;
            logger.info({ imageId: image.id }, 'Generated image caption using vision model');
          } catch (visionError: any) {
            logger.warn({ error: visionError, imageId: image.id }, 'Failed to analyze image, using placeholder');
            enrichedContext.imageCaptions[image.id] = 'Image description will be generated';
          }

          await prisma.sceneGeneration.update({
            where: { id: generationId },
            data: { progress },
          });
          emitProgress(generationId, progress, 'phase0');
        } catch (error: any) {
          logger.error({ error, imageId: image.id }, 'Failed to process image');
          // Continue with other images
        }
      }
    }

    // Process references
    if (request.references && request.references.length > 0) {
      logger.info({ generationId, referenceCount: request.references.length }, 'Processing references');
      
      const referenceAnalyses: string[] = [];
      
      for (const ref of request.references) {
        try {
          // Check if reference is an image URL or path
          if (ref.pathOrUrl.startsWith('http') || ref.pathOrUrl.startsWith('/')) {
            try {
              const refBuffer = await storage.download(ref.pathOrUrl);
              const analysis = await analyzeImage(
                refBuffer,
                'Analyze this reference image for style, color palette, composition, and design elements that should be applied to video generation.',
              );
              referenceAnalyses.push(`Reference ${ref.id}: ${analysis.description}`);
              if (analysis.style && analysis.style.length > 0) {
                referenceAnalyses.push(`Style: ${analysis.style.join(', ')}`);
              }
              if (analysis.colors && analysis.colors.length > 0) {
                referenceAnalyses.push(`Colors: ${analysis.colors.join(', ')}`);
              }
            } catch (refError: any) {
              logger.warn({ error: refError, referenceId: ref.id }, 'Failed to analyze reference, skipping');
            }
          } else {
            // Text reference or URL - just add as note
            referenceAnalyses.push(`Reference ${ref.id}: ${ref.pathOrUrl}`);
          }
        } catch (error: any) {
          logger.warn({ error, referenceId: ref.id }, 'Failed to process reference');
        }
      }
      
      enrichedContext.referenceNotes = referenceAnalyses.join('\n') || 'Reference analysis completed';

      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: { progress: 80 },
      });
      emitProgress(generationId, 80, 'phase0');
    }

    // Cleanup transcription temp directory if it exists
    try {
      const transcriptionTempDir = path.join(os.tmpdir(), `transcription-${generationId}`);
      if (fs.existsSync(transcriptionTempDir)) {
        fs.rmSync(transcriptionTempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      logger.warn({ error: cleanupError }, 'Failed to cleanup transcription temp directory');
    }

    // Update with enriched context
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        enrichedContext: enrichedContext as any,
        progress: 100,
      },
    });
    emitProgress(generationId, 100, 'phase0');

    logger.info({ generationId }, 'Phase 0 completed');
    return enrichedContext;
  } catch (error: any) {
    logger.error({ error, generationId }, 'Phase 0 failed');
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        status: 'failed',
        error: error.message,
      },
    });
    throw error;
  }
}

