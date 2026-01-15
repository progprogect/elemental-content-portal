import { SceneProject } from '../types/scene-generation';
import { logger } from '../config/logger';
import { createStorageAdapter } from '@elemental-content/shared-ai-lib';
import { RenderedScene, RenderContext } from './video-pipeline';
import { VideoPipeline } from './video-pipeline';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PiP (Picture-in-Picture) Scene Pipeline
 * Combines two videos with one as PiP overlay
 */
export class PiPPipeline {
  private videoPipeline: VideoPipeline;

  constructor() {
    this.videoPipeline = new VideoPipeline();
  }

  async canHandle(kind: string): Promise<boolean> {
    return kind === 'pip';
  }

  async render(sceneProject: SceneProject, context: RenderContext): Promise<RenderedScene> {
    logger.info({ sceneId: sceneProject.sceneId }, 'Starting PiP pipeline render');

    if (!sceneProject.inputs.video) {
      throw new Error('Video input is required for PiP pipeline');
    }

    const { storage, tempDir } = context;
    const position = (sceneProject.extra?.position as string) || 'top-right';
    const size = (sceneProject.extra?.size as string) || 'small';

    try {
      // Step 1: Process main video
      const mainVideo = await this.videoPipeline.render(sceneProject, context);
      const mainVideoPath = path.join(tempDir, `main-${sceneProject.sceneId}.mp4`);
      const mainVideoBuffer = await storage.download(mainVideo.renderedAssetPath);
      fs.writeFileSync(mainVideoPath, mainVideoBuffer);

      // Step 2: For PiP, we need a second video source
      // In a real implementation, this would come from sceneProject.inputs.pipVideo
      // For MVP, we'll use the same video scaled down as PiP
      const pipVideoPath = path.join(tempDir, `pip-${sceneProject.sceneId}.mp4`);
      
      // Scale down main video for PiP
      await this.scaleVideoForPiP(mainVideoPath, pipVideoPath, size);

      // Step 3: Composite PiP video on main video
      const outputPath = path.join(tempDir, `pip-final-${sceneProject.sceneId}.mp4`);
      await this.compositePiP(mainVideoPath, pipVideoPath, outputPath, position, size);

      // Step 4: Upload to storage
      const finalVideoBuffer = fs.readFileSync(outputPath);
      const storagePath = `scene-generation/scenes/${sceneProject.sceneId}/rendered.mp4`;
      const uploadResult = await storage.upload(finalVideoBuffer, 'rendered.mp4', storagePath);

      // Get public URL
      const renderedAssetUrl = uploadResult.url;

      // Cleanup
      [mainVideoPath, pipVideoPath, outputPath].forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      logger.info({ sceneId: sceneProject.sceneId }, 'PiP pipeline render completed');

      return {
        sceneId: sceneProject.sceneId,
        renderedAssetPath: uploadResult.path,
        renderedAssetUrl,
        duration: mainVideo.duration,
      };
    } catch (error: any) {
      logger.error({ error, sceneId: sceneProject.sceneId }, 'PiP pipeline render failed');
      throw error;
    }
  }

  private scaleVideoForPiP(inputPath: string, outputPath: string, size: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let scale = '320:180'; // Default small size
      
      if (size === 'medium') {
        scale = '480:270';
      } else if (size === 'large') {
        scale = '640:360';
      }

      ffmpeg(inputPath)
        .videoFilters([`scale=${scale}`])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
        ])
        .output(outputPath)
        .on('end', () => {
          logger.info({ inputPath, outputPath, size }, 'Video scaled for PiP');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ error: err, inputPath, outputPath }, 'Failed to scale video for PiP');
          reject(new Error(`Failed to scale video for PiP: ${err.message}`));
        })
        .run();
    });
  }

  private compositePiP(
    mainVideoPath: string,
    pipVideoPath: string,
    outputPath: string,
    position: string,
    size: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Calculate position
      let x = '10';
      let y = '10';

      if (position === 'top-right') {
        x = 'main_w-overlay_w-10';
        y = '10';
      } else if (position === 'bottom-right') {
        x = 'main_w-overlay_w-10';
        y = 'main_h-overlay_h-10';
      } else if (position === 'bottom-left') {
        x = '10';
        y = 'main_h-overlay_h-10';
      }
      // top-left is default

      ffmpeg(mainVideoPath)
        .input(pipVideoPath)
        .complexFilter([
          {
            filter: 'overlay',
            options: {
              x,
              y,
            },
          },
        ])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
        ])
        .output(outputPath)
        .on('end', () => {
          logger.info({ mainVideoPath, pipVideoPath, outputPath, position }, 'PiP composited successfully');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ error: err, mainVideoPath, pipVideoPath }, 'Failed to composite PiP');
          reject(new Error(`Failed to composite PiP: ${err.message}`));
        })
        .run();
    });
  }
}

