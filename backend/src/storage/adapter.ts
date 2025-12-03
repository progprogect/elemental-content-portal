export interface StorageResult {
  path: string;
  url: string;
  size: number;
}

export interface StorageAdapter {
  upload(file: Buffer, filename: string, path?: string): Promise<StorageResult>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
}

