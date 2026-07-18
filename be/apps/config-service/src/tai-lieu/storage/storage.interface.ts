export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface StoredFileMeta {
  storageKey: string;
  size: number;
}

export interface StorageService {
  save(
    buffer: Buffer,
    opts: { filename: string; mimeType: string; tenantId: string },
  ): Promise<StoredFileMeta>;
  stream(
    storageKey: string,
    tenantId: string,
  ): Promise<NodeJS.ReadableStream>;
  delete(storageKey: string): Promise<void>;
}
