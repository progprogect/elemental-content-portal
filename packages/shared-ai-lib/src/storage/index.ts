import { StorageAdapter } from './adapter';
import { CloudinaryAdapter } from './cloudinary-adapter';
import { CloudflareR2Adapter } from './r2-adapter';
import { AwsS3Adapter } from './s3-adapter';
import { StorageConfig } from '../config';

/**
 * Creates a storage adapter based on configuration or environment variables
 * @param config Optional storage configuration. If not provided, reads from process.env
 * @returns StorageAdapter instance
 */
export function createStorageAdapter(config?: StorageConfig): StorageAdapter {
  // If config is provided, use it
  if (config) {
    switch (config.provider) {
      case 'cloudinary':
        if (!config.cloudinary) {
          throw new Error('Missing Cloudinary configuration');
        }
        return new CloudinaryAdapter(config.cloudinary);

      case 'r2':
        if (!config.r2) {
          throw new Error('Missing R2 configuration');
        }
        return new CloudflareR2Adapter(config.r2);

      case 's3':
        if (!config.s3) {
          throw new Error('Missing S3 configuration');
        }
        return new AwsS3Adapter(config.s3);

      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  // Fallback to environment variables for backward compatibility
  const provider = process.env.STORAGE_PROVIDER || 'cloudinary';

  switch (provider) {
    case 'cloudinary':
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Missing Cloudinary configuration. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
      }
      return new CloudinaryAdapter({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
        folder: process.env.CLOUDINARY_FOLDER,
      });

    case 'r2':
      if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
        throw new Error('Missing R2 configuration. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL');
      }
      return new CloudflareR2Adapter({
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME,
        publicUrl: process.env.R2_PUBLIC_URL,
      });

    case 's3':
      if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.S3_BUCKET_NAME) {
        throw new Error('Missing S3 configuration. Please set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME');
      }
      return new AwsS3Adapter({
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucketName: process.env.S3_BUCKET_NAME,
      });

    default:
      throw new Error(`Unsupported storage provider: ${provider}. Supported: cloudinary, r2, s3`);
  }
}

export { StorageAdapter, StorageResult } from './adapter';
export { CloudinaryAdapter } from './cloudinary-adapter';
export { CloudflareR2Adapter } from './r2-adapter';
export { AwsS3Adapter } from './s3-adapter';

