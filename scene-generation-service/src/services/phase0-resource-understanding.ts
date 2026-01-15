import { GenerationRequest, EnrichedContext } from '../types/scene-generation';
import { createStorageAdapter } from '@elemental-content/shared-ai-lib';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';

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
          // Download video for analysis
          const videoBuffer = await storage.download(video.path);
          
          // TODO: Extract video metadata using FFmpeg
          // For now, use placeholder metadata
          enrichedContext.videoMetadata[video.id] = {
            duration: 0, // Will be extracted via FFmpeg
            fps: 30,
            width: 1920,
            height: 1080,
          };

          // TODO: Transcribe audio if video has audio track
          // For MVP, skip transcription
          // enrichedContext.videoTranscripts[video.id] = await transcribeAudio(videoBuffer, `${video.id}.mp4`);

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
          
          // TODO: Use vision model to generate captions
          // For MVP, use placeholder
          enrichedContext.imageCaptions[image.id] = 'Image description will be generated';

          await prisma.sceneGeneration.update({
            where: { id: generationId },
            data: { progress },
          });
        } catch (error: any) {
          logger.error({ error, imageId: image.id }, 'Failed to process image');
          // Continue with other images
        }
      }
    }

    // Process references
    if (request.references && request.references.length > 0) {
      logger.info({ generationId, referenceCount: request.references.length }, 'Processing references');
      
      // TODO: Analyze references for style and context
      // For MVP, use placeholder
      enrichedContext.referenceNotes = 'Reference analysis will be generated';

      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: { progress: 80 },
      });
    }

    // Update with enriched context
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        enrichedContext: enrichedContext as any,
        progress: 100,
      },
    });

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

