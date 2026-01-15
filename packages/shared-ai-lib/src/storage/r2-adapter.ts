import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { StorageAdapter, StorageResult } from './adapter';

export class CloudflareR2Adapter implements StorageAdapter {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
  }) {
    this.bucketName = config.bucketName;
    this.publicUrl = config.publicUrl;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
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

    // Normalize publicUrl: remove trailing slash to prevent duplication
    const normalizedPublicUrl = this.publicUrl.replace(/\/+$/, '');
    // Ensure key doesn't start with slash
    const normalizedKey = key.replace(/^\/+/, '');
    
    return {
      path: normalizedKey,
      url: `${normalizedPublicUrl}/${normalizedKey}`,
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
    return `${this.publicUrl}/${path}`;
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

