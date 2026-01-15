import { RenderedScene } from '../pipelines/video-pipeline';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';
import { createStorageAdapter } from '@elemental-content/shared-ai-lib';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Phase 4: Final Composition
 * Combines all rendered scenes into final video with transitions and audio mixing
 */
export async function phase4FinalComposition(
  generationId: string,
  renderedScenes: RenderedScene[]
): Promise<{ resultUrl: string; resultPath: string }> {
  logger.info({ generationId, sceneCount: renderedScenes.length }, 'Starting Phase 4: Final Composition');

  try {
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        phase: 'phase4',
        status: 'processing',
        progress: 80,
      },
    });

    const storage = createStorageAdapter();
    const tempDir = path.join(os.tmpdir(), `composition-${generationId}`);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Step 1: Get successfully rendered scenes from database, sorted by orderIndex
    // This ensures correct order even if some scenes failed
    const completedScenes = await prisma.scene.findMany({
      where: {
        sceneGenerationId: generationId,
        status: 'completed',
        renderedAssetPath: { not: null },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    if (completedScenes.length === 0) {
      throw new Error('No scenes were successfully rendered');
    }

    // Step 2: Download all scene videos in correct order
    const sceneVideoPaths: string[] = [];
    logger.info({ generationId, completedScenesCount: completedScenes.length }, 'Downloading scenes for composition');
    
    for (let i = 0; i < completedScenes.length; i++) {
      const scene = completedScenes[i];
      if (!scene.renderedAssetPath) {
        logger.warn({ sceneId: scene.sceneId, sceneIndex: i }, 'Skipping scene without rendered asset path');
        continue;
      }
      
      logger.info({ 
        sceneId: scene.sceneId, 
        sceneIndex: i, 
        renderedAssetPath: scene.renderedAssetPath,
        renderedAssetUrl: scene.renderedAssetUrl,
      }, 'Downloading scene for composition');
      
      try {
        const sceneBuffer = await storage.download(scene.renderedAssetPath);
        logger.info({ 
          sceneId: scene.sceneId, 
          sceneIndex: i, 
          bufferSize: sceneBuffer.length 
        }, 'Scene downloaded successfully');
        
        const scenePath = path.join(tempDir, `scene-${i}.mp4`);
        fs.writeFileSync(scenePath, sceneBuffer);
        logger.info({ sceneId: scene.sceneId, scenePath, fileSize: sceneBuffer.length }, 'Scene saved to temp file');
        sceneVideoPaths.push(scenePath);
      } catch (error: any) {
        logger.error({ 
          error: error.message || error, 
          errorStack: error.stack,
          sceneId: scene.sceneId, 
          sceneIndex: i,
          renderedAssetPath: scene.renderedAssetPath,
          renderedAssetUrl: scene.renderedAssetUrl,
        }, 'Failed to download scene for composition');
        throw new Error(`Failed to download scene ${scene.sceneId}: ${error.message || error}`);
      }
    }
    
    if (sceneVideoPaths.length === 0) {
      throw new Error('No scene videos available for composition');
    }

    // Step 3: Create concat file list for FFmpeg
    const concatFilePath = path.join(tempDir, 'concat.txt');
    const concatLines = sceneVideoPaths.map((p) => `file '${p}'`).join('\n');
    fs.writeFileSync(concatFilePath, concatLines);

    // Step 4: Concatenate videos with transitions
    const outputPath = path.join(tempDir, `final-${generationId}.mp4`);
    await concatenateVideos(concatFilePath, outputPath);

    // Step 5: Upload final video to storage
    const finalVideoBuffer = fs.readFileSync(outputPath);
    const storagePath = `scene-generation/generations/${generationId}/final.mp4`;
    const uploadResult = await storage.upload(finalVideoBuffer, 'final.mp4', storagePath);

    // Get public URL
    const resultUrl = uploadResult.url;

    // Cleanup temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      logger.warn({ error: cleanupError, tempDir }, 'Failed to cleanup temp directory');
    }

    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        progress: 100,
        resultUrl,
        resultPath: uploadResult.path,
      },
    });

    logger.info({ generationId, resultUrl }, 'Phase 4 completed');

    return {
      resultUrl,
      resultPath: uploadResult.path,
    };
  } catch (error: any) {
    logger.error({ error, generationId }, 'Phase 4 failed');
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

/**
 * Concatenate videos using FFmpeg
 */
async function concatenateVideos(concatFilePath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => {
        logger.info({ concatFilePath, outputPath }, 'Videos concatenated successfully');
        resolve();
      })
      .on('error', (err) => {
        logger.error({ error: err, concatFilePath, outputPath }, 'Failed to concatenate videos');
        reject(new Error(`Failed to concatenate videos: ${err.message}`));
      })
      .run();
  });
}

