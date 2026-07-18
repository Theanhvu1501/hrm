import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { TaiLieu, TaiLieuCategory } from '@app/entities';
import { STORAGE_SERVICE } from './storage/storage.interface';
import type { StorageService } from './storage/storage.interface';
import { parseYoutubeId } from './youtube.util';

const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const MAX = 25 * 1024 * 1024;

@Injectable()
export class TaiLieu_Service {
  constructor(
    @InjectRepository(TaiLieu) private readonly repo: Repository<TaiLieu>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  list(category: string) {
    return this.repo.find({
      where: { category: category as TaiLieuCategory },
      order: { createdAt: 'DESC' } as any,
    });
  }

  async createFile(
    file: Express.Multer.File,
    dto: { title: string; moTa?: string; category: string },
    ctx: { tenantId: string; userId?: string },
  ) {
    if (!file) throw new BadRequestException('Thiếu file');
    if (file.size > MAX) throw new BadRequestException('File vượt quá 25MB');
    if (!ALLOWED.has(file.mimetype)) {
      throw new BadRequestException('Định dạng file không hỗ trợ');
    }
    const saved = await this.storage.save(file.buffer, {
      filename: file.originalname,
      mimeType: file.mimetype,
      tenantId: ctx.tenantId,
    });
    const tl = this.repo.create({
      title: dto.title,
      moTa: dto.moTa,
      category: dto.category as TaiLieuCategory,
      type: 'file',
      storageKey: saved.storageKey,
      tenFile: file.originalname,
      mimeType: file.mimetype,
      size: saved.size,
      createdBy: ctx.userId,
    });
    return this.repo.save(tl);
  }

  async createYoutube(
    dto: { title: string; moTa?: string; category: string; youtubeUrl: string },
    ctx: { userId?: string },
  ) {
    const yid = parseYoutubeId(dto.youtubeUrl);
    if (!yid) throw new BadRequestException('Link YouTube không hợp lệ');
    const tl = this.repo.create({
      title: dto.title,
      moTa: dto.moTa,
      category: dto.category as TaiLieuCategory,
      type: 'youtube',
      youtubeUrl: dto.youtubeUrl,
      youtubeId: yid,
      createdBy: ctx.userId,
    });
    return this.repo.save(tl);
  }

  async findOne(id: string) {
    const tl = await this.repo.findOne({
      where: { _id: new ObjectId(id) } as any,
    });
    if (!tl) throw new NotFoundException();
    return tl;
  }

  async streamFile(id: string, tenantId: string) {
    const tl = await this.findOne(id);
    if (tl.type !== 'file' || !tl.storageKey) {
      throw new BadRequestException('Không phải file');
    }
    return { tl, stream: await this.storage.stream(tl.storageKey, tenantId) };
  }

  async remove(id: string) {
    const tl = await this.findOne(id);
    if (tl.storageKey) await this.storage.delete(tl.storageKey);
    await this.repo.remove(tl);
  }
}
