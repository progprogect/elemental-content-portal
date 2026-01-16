import { SceneProject } from '../types/scene-generation';
import { logger } from '../config/logger';
import { createStorageAdapter, StorageAdapter, generateImage } from '@elemental-content/shared-ai-lib';
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
    logger.info({ 
      sceneId: sceneProject.sceneId,
      inputData: {
        sceneId: sceneProject.sceneId,
        kind: sceneProject.kind,
        durationSeconds: sceneProject.scenarioItem.durationSeconds,
        renderContext: sceneProject.renderContext,
        hasImages: !!sceneProject.inputs.images?.length,
        imageIds: sceneProject.inputs.images || [],
        extra: sceneProject.extra,
        detailedRequest: sceneProject.scenarioItem.detailedRequest,
      },
    }, 'Banner Pipeline: Starting render - Input SceneProject');

    const { storage, tempDir } = context;
    const duration = sceneProject.scenarioItem.durationSeconds || 5;
    const fps = sceneProject.renderContext.fps;
    const width = sceneProject.renderContext.width;
    const height = sceneProject.renderContext.height;
    const totalFrames = Math.ceil(duration * fps);
    
    logger.info({ 
      sceneId: sceneProject.sceneId,
      renderParams: {
        duration,
        fps,
        width,
        height,
        totalFrames,
        tempDir,
      },
    }, 'Banner Pipeline: Render parameters calculated');

    try {
      // Step 1: Load or generate images
      const images: Buffer[] = [];
      
      if (sceneProject.inputs.images && sceneProject.inputs.images.length > 0) {
        // Load existing images from storage
        logger.info({ sceneId: sceneProject.sceneId, imageCount: sceneProject.inputs.images.length }, 'Loading images from storage');
        for (const imageId of sceneProject.inputs.images) {
          try {
            const imageBuffer = await storage.download(imageId);
            images.push(imageBuffer);
            logger.debug({ sceneId: sceneProject.sceneId, imageId, bufferSize: imageBuffer.length }, 'Image loaded from storage');
          } catch (error: any) {
            logger.warn({ error: error.message, sceneId: sceneProject.sceneId, imageId }, 'Failed to load image from storage, will generate new one');
          }
        }
      }
      
      // Generate images if we don't have any
      if (images.length === 0) {
        const description = sceneProject.scenarioItem.detailedRequest?.description || sceneProject.scenarioItem.detailedRequest?.goal || 'beautiful scene';
        const imageHints = sceneProject.scenarioItem.detailedRequest?.imageHints || [];
        const visualStyle = sceneProject.scenarioItem.detailedRequest?.visualStyle || [];
        
        // Build prompt for image generation
        let imagePrompt = description;
        if (imageHints.length > 0) {
          imagePrompt += ', ' + imageHints.join(', ');
        }
        if (visualStyle.length > 0) {
          imagePrompt += ', style: ' + visualStyle.join(', ');
        }
        imagePrompt += ', high quality, professional, cinematic';
        
        logger.info({ 
          sceneId: sceneProject.sceneId, 
          imagePrompt,
          description,
          imageHints,
          visualStyle,
        }, 'Generating image for banner');
        
        try {
          // Calculate aspect ratio from width/height
          const aspectRatio = width / height;
          let aspectRatioStr: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '16:9';
          if (Math.abs(aspectRatio - 1) < 0.1) {
            aspectRatioStr = '1:1';
          } else if (Math.abs(aspectRatio - 16/9) < 0.1) {
            aspectRatioStr = '16:9';
          } else if (Math.abs(aspectRatio - 9/16) < 0.1) {
            aspectRatioStr = '9:16';
          } else if (Math.abs(aspectRatio - 4/3) < 0.1) {
            aspectRatioStr = '4:3';
          } else if (Math.abs(aspectRatio - 3/4) < 0.1) {
            aspectRatioStr = '3:4';
          }
          
          const generatedImageResult = await generateImage({
            prompt: imagePrompt,
            aspectRatio: aspectRatioStr,
          }, {
            storage,
          });
          
          // Download the generated image from storage
          const imageBuffer = await storage.download(generatedImageResult.assetPath);
          images.push(imageBuffer);
          logger.info({ sceneId: sceneProject.sceneId, imageSize: imageBuffer.length, assetPath: generatedImageResult.assetPath }, 'Image generated and downloaded successfully');
        } catch (error: any) {
          logger.error({ error: error.message, sceneId: sceneProject.sceneId }, 'Failed to generate image, continuing without image');
        }
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
        const visualStyle = sceneProject.extra?.visualStyle || sceneProject.scenarioItem.detailedRequest?.visualStyle || [];
        this.renderBackground(ctx, width, height, visualStyle);

        // Render images
        if (images.length > 0) {
          await this.renderImages(ctx, images, width, height, progress);
        }

        // Render text
        const textContent = sceneProject.extra?.textContent || 
                           sceneProject.scenarioItem.detailedRequest?.textContent ||
                           sceneProject.scenarioItem.detailedRequest?.description ||
                           '';
        const animationHints = sceneProject.extra?.animationHints || sceneProject.scenarioItem.detailedRequest?.animationHints || [];
        
        if (textContent) {
          this.renderText(ctx, textContent, width, height, progress, animationHints, visualStyle);
        }

        // Save frame
        const framePath = path.join(framesDir, `frame-${frame.toString().padStart(6, '0')}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(framePath, buffer);
      }

      // Step 3: Verify frames were created
      const frameFiles = fs.readdirSync(framesDir).filter(f => f.endsWith('.png')).sort();
      if (frameFiles.length === 0) {
        throw new Error(`No frames created in ${framesDir}`);
      }
      logger.info({ 
        sceneId: sceneProject.sceneId, 
        framesDir, 
        frameCount: frameFiles.length,
        expectedFrames: totalFrames,
      }, 'Frames created, starting video conversion');

      // Step 4: Convert frames to video using FFmpeg
      const outputVideoPath = path.join(tempDir, `banner-${sceneProject.sceneId}.mp4`);
      await this.framesToVideo(framesDir, outputVideoPath, fps);

      // Step 5: Upload to storage
      const videoBuffer = fs.readFileSync(outputVideoPath);
      const storagePath = `scene-generation/scenes/${sceneProject.sceneId}`;
      logger.info({ 
        sceneId: sceneProject.sceneId, 
        storagePath, 
        videoSize: videoBuffer.length,
        outputVideoPath,
      }, 'Uploading rendered video to storage');
      
      const uploadResult = await storage.upload(videoBuffer, 'rendered.mp4', storagePath);
      
      logger.info({ 
        sceneId: sceneProject.sceneId,
        uploadPath: uploadResult.path,
        uploadUrl: uploadResult.url,
        uploadSize: uploadResult.size,
      }, 'Video uploaded to storage successfully');

      // Get public URL
      const renderedAssetUrl = uploadResult.url;

      // Cleanup
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
      if (fs.existsSync(outputVideoPath)) {
        fs.unlinkSync(outputVideoPath);
      }

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
      }, 'Banner Pipeline: Render completed - Output RenderedScene');

      return result;
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

    try {
      const image = await loadImage(images[0]);
      
      // Calculate image size to fit nicely (use up to 60% of width or height)
      const maxImageWidth = width * 0.6;
      const maxImageHeight = height * 0.6;
      
      let imageWidth = image.width;
      let imageHeight = image.height;
      
      // Scale to fit within bounds while maintaining aspect ratio
      const scaleX = maxImageWidth / imageWidth;
      const scaleY = maxImageHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
      
      imageWidth = imageWidth * scale;
      imageHeight = imageHeight * scale;
      
      // Center the image
      const x = (width - imageWidth) / 2;
      const y = (height - imageHeight) / 2;

      // Add subtle shadow/border effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;

      // Fade in animation
      const opacity = Math.min(1, progress * 2);
      ctx.globalAlpha = opacity;
      
      // Draw image
      ctx.drawImage(image, x, y, imageWidth, imageHeight);
      
      ctx.globalAlpha = 1;
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Failed to render image, skipping');
    }
  }

  private renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    progress: number,
    animationHints: string[],
    visualStyle: string[] = []
  ): void {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Determine text color based on background
    const isDarkBackground = visualStyle.includes('blue') || visualStyle.includes('dark');
    ctx.fillStyle = isDarkBackground ? '#ffffff' : '#000000';
    
    // Use larger, more readable font
    const fontSize = Math.min(width / 15, 72); // Responsive font size
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const x = width / 2;
    const y = height / 2;

    // Handle long text - wrap if needed
    const maxWidth = width * 0.8;
    const words = text.split(' ');
    let line = '';
    let yOffset = 0;
    const lineHeight = fontSize * 1.2;
    const maxLines = 3;

    if (animationHints.includes('typewriter')) {
      // Typewriter effect
      const charsToShow = Math.floor(text.length * progress);
      const displayText = text.substring(0, charsToShow);
      const displayWords = displayText.split(' ').filter(w => w.length > 0);
      
      // Wrap text for typewriter using displayWords
      for (let i = 0; i < displayWords.length && yOffset < maxLines * lineHeight; i++) {
        const testLine = line + displayWords[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
          ctx.fillText(line, x, y + yOffset - (lineHeight * (maxLines - 1) / 2));
          line = displayWords[i] + ' ';
          yOffset += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line && yOffset < maxLines * lineHeight) {
        ctx.fillText(line, x, y + yOffset - (lineHeight * (maxLines - 1) / 2));
      }
    } else if (animationHints.includes('fade-in')) {
      // Fade in
      ctx.globalAlpha = Math.min(1, progress * 2);
      
      // Wrap text for fade-in
      for (let i = 0; i < words.length && yOffset < maxLines * lineHeight; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
          ctx.fillText(line, x, y + yOffset - (lineHeight * (maxLines - 1) / 2));
          line = words[i] + ' ';
          yOffset += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line && yOffset < maxLines * lineHeight) {
        ctx.fillText(line, x, y + yOffset - (lineHeight * (maxLines - 1) / 2));
      }
      
      ctx.globalAlpha = 1;
    } else {
      // Default: show text immediately with wrapping
      for (let i = 0; i < words.length && yOffset < maxLines * lineHeight; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
          ctx.fillText(line, x, y + yOffset - (lineHeight * (maxLines - 1) / 2));
          line = words[i] + ' ';
          yOffset += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line && yOffset < maxLines * lineHeight) {
        ctx.fillText(line, x, y + yOffset - (lineHeight * (maxLines - 1) / 2));
      }
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  private framesToVideo(framesDir: string, outputPath: string, fps: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const inputPattern = path.join(framesDir, 'frame-%06d.png');
      let ffmpegStderr = '';

      logger.info({ 
        framesDir, 
        outputPath, 
        inputPattern, 
        fps,
      }, 'Starting FFmpeg conversion');

      const ffmpegProcess = ffmpeg()
        .input(inputPattern)
        .inputFPS(fps)
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r ' + fps,
          '-y', // Overwrite output file if exists
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info({ commandLine, framesDir, outputPath }, 'FFmpeg command started');
        })
        .on('progress', (progress) => {
          logger.debug({ progress, framesDir, outputPath }, 'FFmpeg progress');
        })
        .on('stderr', (stderrLine) => {
          ffmpegStderr += stderrLine + '\n';
        })
        .on('end', () => {
          logger.info({ framesDir, outputPath }, 'Frames converted to video successfully');
          resolve();
        })
        .on('error', (err: any) => {
          const errorMessage = err?.message || 'Unknown FFmpeg error';
          const errorCode = err?.code || 'UNKNOWN';
          const errorStack = err?.stack || '';
          
          logger.error({ 
            error: {
              message: errorMessage,
              code: errorCode,
              stack: errorStack,
              stderr: ffmpegStderr,
            },
            framesDir, 
            outputPath,
            inputPattern,
            fps,
          }, 'Failed to convert frames to video');
          
          reject(new Error(`Failed to convert frames to video: ${errorMessage}. FFmpeg stderr: ${ffmpegStderr.substring(0, 500)}`));
        });

      ffmpegProcess.run();
    });
  }
}

