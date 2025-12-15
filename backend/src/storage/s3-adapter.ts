import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { StorageAdapter, StorageResult } from './adapter';

export class AwsS3Adapter implements StorageAdapter {
  private client: S3Client;
  private bucketName: string;

  constructor(config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  }) {
    this.bucketName = config.bucketName;

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(file: Buffer, filename: string, path?: string): Promise<StorageResult> {
    // Normalize path: remove leading/trailing slashes and prevent duplication
    const normalizedPath = path ? path.replace(/^\/+|\/+$/g, '') : '';
    const key = normalizedPath ? `${normalizedPath}/${filename}` : filename;
    const contentType = this.getContentType(filename);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    // Ensure key doesn't start with slash
    const normalizedKey = key.replace(/^\/+/, '');
    
    // Generate public URL
    const url = `https://${this.bucketName}.s3.amazonaws.com/${normalizedKey}`;

    return {
      path: normalizedKey,
      url,
      size: file.length,
    };
  }

  async delete(path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      })
    );
  }

  async getUrl(path: string): Promise<string> {
    return `https://${this.bucketName}.s3.amazonaws.com/${path}`;
  }

  async download(path: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      })
    );

    if (!response.Body) {
      throw new Error('File not found');
    }

    const chunks: Uint8Array[] = [];
    // @ts-ignore - Body is a stream
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      pdf: 'application/pdf',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}

