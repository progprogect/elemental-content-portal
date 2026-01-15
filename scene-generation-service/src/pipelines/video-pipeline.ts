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
    logger.info({ sceneId: sceneProject.sceneId }, 'Starting video pipeline render');

    if (!sceneProject.inputs.video) {
      throw new Error('Video input is required for video pipeline');
    }

    const { video } = sceneProject.inputs;
    const { storage, tempDir } = context;

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

      logger.info({ sceneId: sceneProject.sceneId, duration }, 'Video pipeline render completed');

      return {
        sceneId: sceneProject.sceneId,
        renderedAssetPath: uploadResult.path,
        renderedAssetUrl,
        duration,
      };
    } catch (error: any) {
      logger.error({ error, sceneId: sceneProject.sceneId }, 'Video pipeline render failed');
      throw error;
    }
  }
}

