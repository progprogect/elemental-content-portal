import { v2 as cloudinary } from 'cloudinary';
import * as https from 'https';
import * as http from 'http';
import { StorageAdapter, StorageResult } from './adapter';

export class CloudinaryAdapter implements StorageAdapter {
  private folder?: string;

  constructor(config: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder?: string;
  }) {
    this.folder = config.folder;
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  async upload(file: Buffer, filename: string, path?: string): Promise<StorageResult> {
    return new Promise((resolve, reject) => {
      // Use provided path or default folder
      const folderPath = path || this.folder;
      
      // Generate public_id: remove extension and use folder path if provided
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      // If folderPath is provided, include it in public_id, but don't set folder option separately
      // to avoid duplication
      // Normalize folderPath: remove leading/trailing slashes
      const normalizedFolderPath = folderPath ? folderPath.replace(/^\/+|\/+$/g, '') : '';
      const publicId = normalizedFolderPath ? `${normalizedFolderPath}/${nameWithoutExt}` : nameWithoutExt;

      // Detect resource type from filename extension
      const extension = filename.split('.').pop()?.toLowerCase();
      let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
      if (extension === 'mp4' || extension === 'mov' || extension === 'avi' || extension === 'webm') {
        resourceType = 'video';
      } else if (extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'gif' || extension === 'webp') {
        resourceType = 'image';
      }

      const uploadOptions: any = {
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false,
      };

      console.log('[CloudinaryAdapter] Uploading file:', {
        filename,
        folderPath,
        normalizedFolderPath,
        publicId,
        resourceType,
        fileSize: file.length,
      });

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: Error | undefined, result: any) => {
          if (error) {
            console.error('[CloudinaryAdapter] Upload error:', error);
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Upload failed: no result'));
            return;
          }

          console.log('[CloudinaryAdapter] Upload successful:', {
            publicId: result.public_id,
            url: result.secure_url,
            resourceType: result.resource_type,
            format: result.format,
          });

          resolve({
            path: result.public_id, // Store public_id (without extension) for Cloudinary
            url: result.secure_url,
            size: result.bytes || file.length,
          });
        }
      );

      uploadStream.end(file);
    });
  }

  async delete(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Extract resource type from path if needed
      // Cloudinary needs resource_type for deletion
      cloudinary.uploader.destroy(path, { invalidate: true }, (error: Error | undefined, result: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async getUrl(path: string): Promise<string> {
    // Cloudinary can generate URLs on the fly
    return cloudinary.url(path, { secure: true });
  }

  async download(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      console.log('[CloudinaryAdapter] Downloading resource:', { path });
      
      // Try to detect resource type from path (video files might need explicit resource_type)
      const isVideo = path.includes('.mp4') || path.includes('.mov') || path.includes('.avi') || path.includes('.webm');
      const resourceType = isVideo ? 'video' : 'image';
      
      // Remove file extension from path if present (Cloudinary public_id doesn't include extension)
      const publicId = path.replace(/\.(mp4|mov|avi|webm|png|jpg|jpeg|gif|webp)$/i, '');
      
      console.log('[CloudinaryAdapter] Resolved public_id:', { originalPath: path, publicId, resourceType });
      
      cloudinary.api.resource(publicId, { resource_type: resourceType }, (error: Error | undefined, result: any) => {
        if (error) {
          console.error('[CloudinaryAdapter] Resource lookup error:', { path, publicId, error: error.message });
          // Try with 'auto' resource type as fallback
          cloudinary.api.resource(publicId, (fallbackError: Error | undefined, fallbackResult: any) => {
            if (fallbackError) {
              console.error('[CloudinaryAdapter] Fallback resource lookup error:', { path, publicId, error: fallbackError.message });
              reject(new Error(`Resource not found: ${path} (${fallbackError.message})`));
              return;
            }
            
            if (!fallbackResult || !fallbackResult.secure_url) {
              reject(new Error(`Resource not found: ${path}`));
              return;
            }
            
            console.log('[CloudinaryAdapter] Resource found (fallback):', { publicId, url: fallbackResult.secure_url });
            this.downloadFromUrl(fallbackResult.secure_url, resolve, reject);
          });
          return;
        }

        if (!result || !result.secure_url) {
          console.error('[CloudinaryAdapter] Resource not found:', { path, publicId });
          reject(new Error(`Resource not found: ${path}`));
          return;
        }

        console.log('[CloudinaryAdapter] Resource found:', { publicId, url: result.secure_url });
        this.downloadFromUrl(result.secure_url, resolve, reject);
      });
    });
  }

  private downloadFromUrl(url: string, resolve: (value: Buffer) => void, reject: (reason?: any) => void): void {
    // Download file from Cloudinary URL using Node.js https/http
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.error('[CloudinaryAdapter] Download failed:', { url, statusCode: response.statusCode });
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log('[CloudinaryAdapter] Download completed:', { url, size: buffer.length });
        resolve(buffer);
      });
      response.on('error', (err) => {
        console.error('[CloudinaryAdapter] Download stream error:', { url, error: err });
        reject(err);
      });
    }).on('error', (err) => {
      console.error('[CloudinaryAdapter] Download request error:', { url, error: err });
      reject(err);
    });
  }
}

