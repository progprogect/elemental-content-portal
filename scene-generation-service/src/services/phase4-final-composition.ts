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
    logger.info({ generationId }, 'Phase 4: Fetching completed scenes from database');
    
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

    logger.info({ 
      generationId,
      completedScenesCount: completedScenes.length,
      completedScenes: completedScenes.map(s => ({
        sceneId: s.sceneId,
        orderIndex: s.orderIndex,
        renderedAssetPath: s.renderedAssetPath,
        renderedAssetUrl: s.renderedAssetUrl,
        hasPath: !!s.renderedAssetPath,
        hasUrl: !!s.renderedAssetUrl,
      })),
    }, 'Phase 4: Completed scenes fetched from database');

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
        let sceneBuffer: Buffer;
        
        // Prefer using URL for direct download (more reliable than path lookup)
        if (scene.renderedAssetUrl) {
          logger.info({ 
            sceneId: scene.sceneId, 
            url: scene.renderedAssetUrl,
          }, 'Downloading scene from URL');
          
          try {
            const response = await fetch(scene.renderedAssetUrl);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            sceneBuffer = Buffer.from(arrayBuffer);
            logger.info({ 
              sceneId: scene.sceneId, 
              bufferSize: sceneBuffer.length,
            }, 'Scene downloaded from URL successfully');
          } catch (urlError: any) {
            logger.warn({ 
              error: urlError, 
              sceneId: scene.sceneId,
              url: scene.renderedAssetUrl,
            }, 'Failed to download from URL, trying storage path');
            
            // Fallback to storage path
            if (scene.renderedAssetPath) {
              sceneBuffer = await storage.download(scene.renderedAssetPath);
            } else {
              throw new Error(`No URL or path available for scene ${scene.sceneId}`);
            }
          }
        } else if (scene.renderedAssetPath) {
          // Fallback to storage path if URL not available
          logger.info({ 
            sceneId: scene.sceneId, 
            path: scene.renderedAssetPath,
          }, 'Downloading scene from storage path');
          sceneBuffer = await storage.download(scene.renderedAssetPath);
          logger.info({ 
            sceneId: scene.sceneId, 
            bufferSize: sceneBuffer.length,
          }, 'Scene downloaded from storage path successfully');
        } else {
          throw new Error(`No URL or path available for scene ${scene.sceneId}`);
        }
        
        const scenePath = path.join(tempDir, `scene-${i}.mp4`);
        fs.writeFileSync(scenePath, sceneBuffer);
        
        // Verify file was created and has content
        const fileStats = fs.statSync(scenePath);
        logger.info({ 
          sceneId: scene.sceneId, 
          sceneIndex: i,
          scenePath, 
          fileSize: sceneBuffer.length,
          fileSizeOnDisk: fileStats.size,
          fileExists: fs.existsSync(scenePath),
          isFile: fileStats.isFile(),
        }, 'Phase 4: Scene saved to temp file - verification');
        
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

    // Verify all scene files exist and have content
    logger.info({ 
      generationId,
      sceneVideoPathsCount: sceneVideoPaths.length,
      sceneVideoPaths: sceneVideoPaths.map((p, idx) => {
        const stats = fs.existsSync(p) ? fs.statSync(p) : null;
        return {
          index: idx,
          path: p,
          exists: fs.existsSync(p),
          size: stats?.size || 0,
          isFile: stats?.isFile() || false,
        };
      }),
      allFilesExist: sceneVideoPaths.every(p => fs.existsSync(p)),
      allFilesHaveSize: sceneVideoPaths.every(p => {
        if (!fs.existsSync(p)) return false;
        const stats = fs.statSync(p);
        return stats.size > 0;
      }),
    }, 'Phase 4: Scene video files verification before concatenation');

    // Step 3: Create concat file list for FFmpeg
    const concatFilePath = path.join(tempDir, 'concat.txt');
    const concatLines = sceneVideoPaths.map((p) => `file '${p}'`).join('\n');
    fs.writeFileSync(concatFilePath, concatLines);
    
    logger.info({ 
      generationId,
      concatFilePath,
      concatLines,
      concatFileSize: fs.statSync(concatFilePath).size,
    }, 'Phase 4: FFmpeg concat file created');

    // Step 4: Concatenate videos with transitions
    const outputPath = path.join(tempDir, `final-${generationId}.mp4`);
    logger.info({ 
      generationId,
      outputPath,
      inputScenesCount: sceneVideoPaths.length,
    }, 'Phase 4: Starting video concatenation');
    
    await concatenateVideos(concatFilePath, outputPath);
    
    // Verify output file
    const outputStats = fs.statSync(outputPath);
    logger.info({ 
      generationId,
      outputPath,
      outputFileSize: outputStats.size,
      outputFileExists: fs.existsSync(outputPath),
      outputIsFile: outputStats.isFile(),
      outputHasContent: outputStats.size > 0,
    }, 'Phase 4: Video concatenation completed - output file verification');

    // Step 5: Upload final video to storage
    const finalVideoBuffer = fs.readFileSync(outputPath);
    logger.info({ 
      generationId,
      finalVideoBufferSize: finalVideoBuffer.length,
      storagePath: `scene-generation/generations/${generationId}/final.mp4`,
    }, 'Phase 4: Uploading final video to storage');
    
    const storagePath = `scene-generation/generations/${generationId}/final.mp4`;
    const uploadResult = await storage.upload(finalVideoBuffer, 'final.mp4', storagePath);
    
    logger.info({ 
      generationId,
      uploadResult: {
        path: uploadResult.path,
        url: uploadResult.url,
        size: uploadResult.size,
      },
    }, 'Phase 4: Final video uploaded to storage');

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

