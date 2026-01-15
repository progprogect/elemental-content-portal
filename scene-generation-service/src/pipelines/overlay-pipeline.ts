import { SceneProject } from '../types/scene-generation';
import { logger } from '../config/logger';
import { createStorageAdapter } from '@elemental-content/shared-ai-lib';
import { RenderedScene, RenderContext } from './video-pipeline';
import { VideoPipeline } from './video-pipeline';
import { trimVideo, cropVideoToAspectRatio } from '../utils/ffmpeg';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Overlay Scene Pipeline
 * Combines video with graphical overlays (text panels, graphics)
 */
export class OverlayPipeline {
  private videoPipeline: VideoPipeline;

  constructor() {
    this.videoPipeline = new VideoPipeline();
  }

  async canHandle(kind: string): Promise<boolean> {
    return kind === 'overlay';
  }

  async render(sceneProject: SceneProject, context: RenderContext): Promise<RenderedScene> {
    logger.info({ sceneId: sceneProject.sceneId }, 'Starting overlay pipeline render');

    if (!sceneProject.inputs.video) {
      throw new Error('Video input is required for overlay pipeline');
    }

    const { storage, tempDir } = context;

    try {
      // Step 1: Process base video (same as Video Pipeline)
      const baseVideo = await this.videoPipeline.render(sceneProject, context);
      const baseVideoPath = path.join(tempDir, `base-${sceneProject.sceneId}.mp4`);
      const baseVideoBuffer = await storage.download(baseVideo.renderedAssetPath);
      fs.writeFileSync(baseVideoPath, baseVideoBuffer);

      // Step 2: Create overlay graphics
      const overlayPath = path.join(tempDir, `overlay-${sceneProject.sceneId}.png`);
      await this.createOverlayImage(
        overlayPath,
        sceneProject.renderContext.width,
        sceneProject.renderContext.height,
        sceneProject.extra || {}
      );

      // Step 3: Composite overlay on video using FFmpeg
      const outputPath = path.join(tempDir, `overlay-final-${sceneProject.sceneId}.mp4`);
      await this.compositeOverlay(baseVideoPath, overlayPath, outputPath, sceneProject.extra?.layoutHint || 'side_panel_right');

      // Step 4: Upload to storage
      const finalVideoBuffer = fs.readFileSync(outputPath);
      const storagePath = `scene-generation/scenes/${sceneProject.sceneId}/rendered.mp4`;
      const uploadResult = await storage.upload(finalVideoBuffer, 'rendered.mp4', storagePath);

      // Get public URL
      const renderedAssetUrl = uploadResult.url;

      // Cleanup
      [baseVideoPath, overlayPath, outputPath].forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      logger.info({ sceneId: sceneProject.sceneId }, 'Overlay pipeline render completed');

      return {
        sceneId: sceneProject.sceneId,
        renderedAssetPath: uploadResult.path,
        renderedAssetUrl,
        duration: baseVideo.duration,
      };
    } catch (error: any) {
      logger.error({ error, sceneId: sceneProject.sceneId }, 'Overlay pipeline render failed');
      throw error;
    }
  }

  private async createOverlayImage(
    outputPath: string,
    width: number,
    height: number,
    extra: Record<string, any>
  ): Promise<void> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, width, height);

    const layoutHint = extra.layoutHint || 'side_panel_right';
    const textContent = extra.textContent || '';

    if (layoutHint === 'side_panel_right') {
      // Create right panel
      const panelWidth = width * 0.3;
      const panelX = width - panelWidth;
      const panelHeight = height;
      
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(panelX, 0, panelWidth, panelHeight);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      const lines = this.wrapText(ctx, textContent, panelWidth - 40);
      const lineHeight = 40;
      const startY = height / 2 - (lines.length * lineHeight) / 2;
      
      lines.forEach((line, index) => {
        ctx.fillText(line, panelX + 20, startY + index * lineHeight);
      });
    } else {
      // Default: centered text overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textContent, width / 2, height / 2);
    }

    // Save overlay
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }

  private compositeOverlay(
    videoPath: string,
    overlayPath: string,
    outputPath: string,
    layoutHint: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let filter = `overlay=0:0`; // Default: top-left

      if (layoutHint === 'side_panel_right') {
        // Overlay on right side (will be positioned by overlay image itself)
        filter = `overlay=0:0:format=auto`;
      }

      ffmpeg(videoPath)
        .input(overlayPath)
        .complexFilter([
          {
            filter: 'overlay',
            options: {
              x: 0,
              y: 0,
            },
          },
        ])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
        ])
        .output(outputPath)
        .on('end', () => {
          logger.info({ videoPath, overlayPath, outputPath }, 'Overlay composited successfully');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ error: err, videoPath, overlayPath }, 'Failed to composite overlay');
          reject(new Error(`Failed to composite overlay: ${err.message}`));
        })
        .run();
    });
  }
}

