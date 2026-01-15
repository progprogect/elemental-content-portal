import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../config/logger';
import { createStorageAdapter } from '@elemental-content/shared-ai-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface VideoMetadata {
  duration: number;
  fps: number;
  width: number;
  height: number;
  codec: string;
  bitrate?: number;
}

/**
 * Extract video metadata using FFmpeg
 */
export async function extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        logger.error({ error: err, videoPath }, 'Failed to extract video metadata');
        reject(new Error(`Failed to extract video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const duration = metadata.format?.duration || 0;
      // Parse fps from r_frame_rate (format: "30/1" or "29.97/1")
      const fpsMatch = (videoStream.r_frame_rate || '30/1').match(/(\d+(?:\.\d+)?)\/(\d+)/);
      const fps = fpsMatch ? parseFloat(fpsMatch[1]) / parseFloat(fpsMatch[2]) : 30;
      const width = videoStream.width || 1920;
      const height = videoStream.height || 1080;
      const codec = videoStream.codec_name || 'unknown';
      const bitrate = metadata.format?.bit_rate ? parseInt(String(metadata.format.bit_rate)) : undefined;

      resolve({
        duration,
        fps: Math.round(fps),
        width,
        height,
        codec,
        bitrate,
      });
    });
  });
}

/**
 * Download video from storage and extract metadata
 */
export async function extractVideoMetadataFromStorage(storagePath: string): Promise<VideoMetadata> {
  const storage = createStorageAdapter();
  const videoBuffer = await storage.download(storagePath);
  
  // Create temporary file
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`);
  
  try {
    fs.writeFileSync(tempFilePath, videoBuffer);
    const metadata = await extractVideoMetadata(tempFilePath);
    return metadata;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

/**
 * Trim video segment
 */
export async function trimVideo(
  inputPath: string,
  outputPath: string,
  fromSeconds: number,
  toSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(fromSeconds)
      .setDuration(toSeconds - fromSeconds)
      .output(outputPath)
      .on('end', () => {
        logger.info({ inputPath, outputPath, fromSeconds, toSeconds }, 'Video trimmed successfully');
        resolve();
      })
      .on('error', (err) => {
        logger.error({ error: err, inputPath, outputPath }, 'Failed to trim video');
        reject(new Error(`Failed to trim video: ${err.message}`));
      })
      .run();
  });
}

/**
 * Crop video to target aspect ratio
 */
export async function cropVideoToAspectRatio(
  inputPath: string,
  outputPath: string,
  targetAspectRatio: number,
  width: number = 1920
): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetHeight = Math.round(width / targetAspectRatio);

    ffmpeg(inputPath)
      .videoFilters([
        `scale=${width}:${targetHeight}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`,
      ])
      .output(outputPath)
      .on('end', () => {
        logger.info({ inputPath, outputPath, targetAspectRatio }, 'Video cropped successfully');
        resolve();
      })
      .on('error', (err) => {
        logger.error({ error: err, inputPath, outputPath }, 'Failed to crop video');
        reject(new Error(`Failed to crop video: ${err.message}`));
      })
      .run();
  });
}

/**
 * Extract audio from video
 */
export async function extractAudio(
  videoPath: string,
  outputAudioPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputAudioPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .on('end', () => {
        logger.info({ videoPath, outputAudioPath }, 'Audio extracted successfully');
        resolve();
      })
      .on('error', (err) => {
        logger.error({ error: err, videoPath, outputAudioPath }, 'Failed to extract audio');
        reject(new Error(`Failed to extract audio: ${err.message}`));
      })
      .run();
  });
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableEncoders((err, encoders) => {
      if (err) {
        logger.warn({ error: err }, 'FFmpeg not available');
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

