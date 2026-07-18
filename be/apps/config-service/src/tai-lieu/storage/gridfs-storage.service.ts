import {
  Injectable,
  OnModuleDestroy,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoClient, Db, GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { StorageService, StoredFileMeta } from './storage.interface';

/**
 * Lưu file qua GridFS, dùng MongoClient riêng (từ env MONGODB_URI/MONGODB_DATABASE),
 * bucket `tai_lieu_files`. Mỗi file lưu metadata.tenantId; stream phải khớp tenant.
 */
@Injectable()
export class GridFsStorageService
  implements StorageService, OnModuleDestroy
{
  private client?: MongoClient;
  private bucket?: GridFSBucket;

  private async getBucket(): Promise<GridFSBucket> {
    if (this.bucket) return this.bucket;
    const uri = process.env.MONGODB_URI as string;
    const dbName = process.env.MONGODB_DATABASE as string;
    this.client = new MongoClient(uri);
    await this.client.connect();
    const db: Db = this.client.db(dbName);
    this.bucket = new GridFSBucket(db, { bucketName: 'tai_lieu_files' });
    return this.bucket;
  }

  async save(
    buffer: Buffer,
    opts: { filename: string; mimeType: string; tenantId: string },
  ): Promise<StoredFileMeta> {
    const bucket = await this.getBucket();
    return new Promise((resolve, reject) => {
      const up = bucket.openUploadStream(opts.filename, {
        metadata: { tenantId: opts.tenantId, mimeType: opts.mimeType },
      });
      Readable.from(buffer)
        .pipe(up)
        .on('error', reject)
        .on('finish', () =>
          resolve({ storageKey: up.id.toString(), size: buffer.length }),
        );
    });
  }

  async stream(
    storageKey: string,
    tenantId: string,
  ): Promise<NodeJS.ReadableStream> {
    const bucket = await this.getBucket();
    const _id = new ObjectId(storageKey);
    const files = await bucket.find({ _id }).toArray();
    if (!files.length) throw new NotFoundException('Không tìm thấy file');
    if (files[0].metadata?.tenantId !== tenantId) {
      throw new ForbiddenException('Không có quyền');
    }
    return bucket.openDownloadStream(_id);
  }

  async delete(storageKey: string): Promise<void> {
    const bucket = await this.getBucket();
    try {
      await bucket.delete(new ObjectId(storageKey));
    } catch {
      /* đã xoá */
    }
  }

  async onModuleDestroy() {
    await this.client?.close();
  }
}
