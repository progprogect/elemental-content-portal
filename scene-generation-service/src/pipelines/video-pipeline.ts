import { SceneProject } from '../types/scene-generation';
import { logger } from '../config/logger';
import { createStorageAdapter, StorageAdapter } from '@elemental-content/shared-ai-lib';
import { trimVideo, cropVideoToAspectRatio, extractVideoMetadataFromStorage } from '../utils/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface RenderedScene {
  sceneId: string;
  renderedAssetPath: string;
  renderedAssetUrl: string;
  duration: number;
}

export interface RenderContext {
  storage: StorageAdapter;
  tempDir: string;
}

/**
 * Video Scene Pipeline
 * Handles video trimming, cropping, and processing
 */
export class VideoPipeline {
  async canHandle(kind: string): Promise<boolean> {
    return kind === 'video';
  }

  async render(sceneProject: SceneProject, context: RenderContext): Promise<RenderedScene> {
    logger.info({ 
      sceneId: sceneProject.sceneId,
      inputData: {
        sceneId: sceneProject.sceneId,
        kind: sceneProject.kind,
        videoInput: sceneProject.inputs.video,
        renderContext: sceneProject.renderContext,
        tempDir: context.tempDir,
      },
    }, 'Video Pipeline: Starting render - Input SceneProject');

    if (!sceneProject.inputs.video) {
      throw new Error('Video input is required for video pipeline');
    }

    const { video } = sceneProject.inputs;
    const { storage, tempDir } = context;
    
    logger.info({ 
      sceneId: sceneProject.sceneId,
      videoInput: {
        id: video.id,
        fromSeconds: video.fromSeconds,
        toSeconds: video.toSeconds,
        segmentDuration: video.toSeconds - video.fromSeconds,
      },
    }, 'Video Pipeline: Video input parameters');

    try {
      // Download source video
      const sourceVideoBuffer = await storage.download(video.id);
      const sourceVideoPath = path.join(tempDir, `source-${sceneProject.sceneId}.mp4`);
      fs.writeFileSync(sourceVideoPath, sourceVideoBuffer);

      // Step 1: Trim video segment
      const trimmedPath = path.join(tempDir, `trimmed-${sceneProject.sceneId}.mp4`);
      await trimVideo(sourceVideoPath, trimmedPath, video.fromSeconds, video.toSeconds);

      // Step 2: Crop to target aspect ratio
      const croppedPath = path.join(tempDir, `cropped-${sceneProject.sceneId}.mp4`);
      await cropVideoToAspectRatio(
        trimmedPath,
        croppedPath,
        sceneProject.renderContext.aspectRatio,
        sceneProject.renderContext.width
      );

      // Step 3: Upload to storage
      const finalVideoBuffer = fs.readFileSync(croppedPath);
      const storagePath = `scene-generation/scenes/${sceneProject.sceneId}/rendered.mp4`;
      const uploadResult = await storage.upload(finalVideoBuffer, 'rendered.mp4', storagePath);

      // Get public URL
      const renderedAssetUrl = uploadResult.url;

      // Get duration
      const metadata = await extractVideoMetadataFromStorage(storagePath);
      const duration = metadata.duration;

      // Cleanup temp files
      [sourceVideoPath, trimmedPath, croppedPath].forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      const result: RenderedScene = {
        sceneId: sceneProject.sceneId,
        renderedAssetPath: uploadResult.path,
        renderedAssetUrl,
        duration,
      };
      
      logger.info({ 
        sceneId: sceneProject.sceneId,
        outputData: {
          sceneId: result.sceneId,
          renderedAssetPath: result.renderedAssetPath,
          renderedAssetUrl: result.renderedAssetUrl,
          duration: result.duration,
          hasPath: !!result.renderedAssetPath,
          hasUrl: !!result.renderedAssetUrl,
          urlFormat: result.renderedAssetUrl?.startsWith('http') ? 'http' : 'other',
          pathFormat: result.renderedAssetPath?.includes('.mp4') ? 'mp4' : 'other',
        },
      }, 'Video Pipeline: Render completed - Output RenderedScene');

      return result;
    } catch (error: any) {
      logger.error({ error, sceneId: sceneProject.sceneId }, 'Video pipeline render failed');
      throw error;
    }
  }
}

