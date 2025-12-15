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
      const publicId = folderPath ? `${folderPath}/${nameWithoutExt}` : nameWithoutExt;

      const uploadOptions: any = {
        resource_type: 'auto', // Automatically detect image/video/raw
        public_id: publicId,
        overwrite: false,
      };

      // Don't set folder if public_id already contains the path to avoid duplication
      // Cloudinary will use public_id as the full path, so folder is not needed

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: Error | undefined, result: any) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Upload failed: no result'));
            return;
          }

          resolve({
            path: result.public_id,
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
      cloudinary.api.resource(path, (error: Error | undefined, result: any) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result || !result.secure_url) {
          reject(new Error('Resource not found'));
          return;
        }

        // Download file from Cloudinary URL using Node.js https/http
        const parsedUrl = new URL(result.secure_url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        client.get(result.secure_url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        }).on('error', reject);
      });
    });
  }
}

