import { SceneProject } from '../types/scene-generation';
import { logger } from '../config/logger';
import { createStorageAdapter, StorageAdapter, generateImage, AIConfig } from '@elemental-content/shared-ai-lib';
import { RenderedScene, RenderContext } from './video-pipeline';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Banner Scene Pipeline
 * Generates animated banners from images, text, and graphics
 */
export class BannerPipeline {
  async canHandle(kind: string): Promise<boolean> {
    return kind === 'banner';
  }

  async render(sceneProject: SceneProject, context: RenderContext): Promise<RenderedScene> {
    logger.info({ sceneId: sceneProject.sceneId }, 'Starting banner pipeline render');

    const { storage, tempDir } = context;
    const duration = sceneProject.scenarioItem.durationSeconds || 5;
    const fps = sceneProject.renderContext.fps;
    const width = sceneProject.renderContext.width;
    const height = sceneProject.renderContext.height;
    const totalFrames = Math.ceil(duration * fps);

    try {
      // Step 1: Load or generate images
      const images: Buffer[] = [];
      
      if (sceneProject.inputs.images && sceneProject.inputs.images.length > 0) {
        // Load existing images from storage
        for (const imageId of sceneProject.inputs.images) {
          const imageBuffer = await storage.download(imageId);
          images.push(imageBuffer);
        }
      } else if (sceneProject.extra?.imageHints && sceneProject.extra.imageHints.length > 0) {
        // Generate images if needed (simplified - would use LLM for better prompts)
        logger.info({ sceneId: sceneProject.sceneId }, 'Generating images for banner');
        // For MVP, skip image generation - use placeholder
      }

      // Step 2: Create canvas frames
      const framesDir = path.join(tempDir, `frames-${sceneProject.sceneId}`);
      if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
      }

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Render frames
      for (let frame = 0; frame < totalFrames; frame++) {
        const progress = frame / totalFrames;
        
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Apply background (gradient or color)
        this.renderBackground(ctx, width, height, sceneProject.extra?.visualStyle || []);

        // Render images
        if (images.length > 0) {
          await this.renderImages(ctx, images, width, height, progress);
        }

        // Render text
        if (sceneProject.extra?.textContent) {
          this.renderText(ctx, sceneProject.extra.textContent, width, height, progress, sceneProject.extra.animationHints || []);
        }

        // Save frame
        const framePath = path.join(framesDir, `frame-${frame.toString().padStart(6, '0')}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(framePath, buffer);
      }

      // Step 3: Convert frames to video using FFmpeg
      const outputVideoPath = path.join(tempDir, `banner-${sceneProject.sceneId}.mp4`);
      await this.framesToVideo(framesDir, outputVideoPath, fps);

      // Step 4: Upload to storage
      const videoBuffer = fs.readFileSync(outputVideoPath);
      const storagePath = `scene-generation/scenes/${sceneProject.sceneId}/rendered.mp4`;
      const uploadResult = await storage.upload(videoBuffer, 'rendered.mp4', storagePath);

      // Get public URL
      const renderedAssetUrl = uploadResult.url;

      // Cleanup
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
      if (fs.existsSync(outputVideoPath)) {
        fs.unlinkSync(outputVideoPath);
      }

      logger.info({ sceneId: sceneProject.sceneId, duration }, 'Banner pipeline render completed');

      return {
        sceneId: sceneProject.sceneId,
        renderedAssetPath: uploadResult.path,
        renderedAssetUrl,
        duration,
      };
    } catch (error: any) {
      logger.error({ error, sceneId: sceneProject.sceneId }, 'Banner pipeline render failed');
      throw error;
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number, visualStyle: string[]): void {
    if (visualStyle.includes('blue')) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(1, '#3b82f6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (visualStyle.includes('minimal')) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else {
      // Default gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(1, '#e5e7eb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private async renderImages(
    ctx: CanvasRenderingContext2D,
    images: Buffer[],
    width: number,
    height: number,
    progress: number
  ): Promise<void> {
    if (images.length === 0) return;

    const image = await loadImage(images[0]);
    const imageWidth = Math.min(width * 0.4, image.width);
    const imageHeight = (image.height / image.width) * imageWidth;
    const x = width * 0.1;
    const y = (height - imageHeight) / 2;

    // Fade in animation
    const opacity = Math.min(1, progress * 2);
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, x, y, imageWidth, imageHeight);
    ctx.globalAlpha = 1;
  }

  private renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    progress: number,
    animationHints: string[]
  ): void {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = width / 2;
    const y = height / 2;

    if (animationHints.includes('typewriter')) {
      // Typewriter effect
      const charsToShow = Math.floor(text.length * progress);
      const displayText = text.substring(0, charsToShow);
      ctx.fillText(displayText, x, y);
    } else if (animationHints.includes('fade-in')) {
      // Fade in
      ctx.globalAlpha = Math.min(1, progress * 2);
      ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
    } else {
      // Default: show text immediately
      ctx.fillText(text, x, y);
    }
  }

  private framesToVideo(framesDir: string, outputPath: string, fps: number): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(framesDir, 'frame-%06d.png'))
        .inputFPS(fps)
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r ' + fps,
        ])
        .output(outputPath)
        .on('end', () => {
          logger.info({ framesDir, outputPath }, 'Frames converted to video');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ error: err, framesDir, outputPath }, 'Failed to convert frames to video');
          reject(new Error(`Failed to convert frames to video: ${err.message}`));
        })
        .run();
    });
  }
}

