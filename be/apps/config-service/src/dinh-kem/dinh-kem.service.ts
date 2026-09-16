import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { DinhKem } from '@app/entities';
import { STORAGE_SERVICE } from '../tai-lieu/storage/storage.interface';
import type { StorageService } from '../tai-lieu/storage/storage.interface';

/**
 * Định dạng cho phép — hẹp hơn Thư viện tài liệu một cách có chủ đích: đây là
 * giấy tờ tuỳ thân và chứng từ, không phải kho tài liệu chung, nên không mở
 * cho ppt/xls.
 */
const CHO_PHEP = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const TOI_DA = 15 * 1024 * 1024;

export interface TimDinhKem {
  doiTuong: string;
  doiTuongId: string;
  nhom?: string;
  khoaPhu?: string;
}

@Injectable()
export class DinhKem_Service {
  constructor(
    @InjectRepository(DinhKem) private readonly repo: Repository<DinhKem>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async danhSach(q: TimDinhKem): Promise<DinhKem[]> {
    if (!q.doiTuong || !q.doiTuongId) {
      throw new BadRequestException('Thiếu đối tượng đính kèm');
    }
    const where: Record<string, unknown> = {
      doiTuong: q.doiTuong,
      doiTuongId: q.doiTuongId,
    };
    if (q.nhom) where.nhom = q.nhom;
    if (q.khoaPhu) where.khoaPhu = q.khoaPhu;
    return this.repo.find({
      where: where as any,
      order: { createdAt: 'ASC' } as any,
    });
  }

  async tai(
    file: Express.Multer.File,
    dto: TimDinhKem,
    ctx: { tenantId: string; userId?: string },
  ): Promise<DinhKem> {
    if (!file) throw new BadRequestException('Thiếu file');
    if (file.size > TOI_DA) {
      throw new BadRequestException('File vượt quá 15MB');
    }
    if (!CHO_PHEP.has(file.mimetype)) {
      throw new BadRequestException(
        'Chỉ nhận ảnh (JPG/PNG/HEIC/WEBP), PDF hoặc Word',
      );
    }
    if (!dto.doiTuong || !dto.doiTuongId || !dto.nhom) {
      throw new BadRequestException('Thiếu thông tin đính kèm');
    }
    const luu = await this.storage.save(file.buffer, {
      filename: file.originalname,
      mimeType: file.mimetype,
      tenantId: ctx.tenantId,
    });
    const dk = this.repo.create({
      doiTuong: dto.doiTuong,
      doiTuongId: dto.doiTuongId,
      nhom: dto.nhom,
      khoaPhu: dto.khoaPhu,
      tenFile: file.originalname,
      storageKey: luu.storageKey,
      mimeType: file.mimetype,
      size: luu.size,
      createdBy: ctx.userId,
    });
    return this.repo.save(dk);
  }

  async mot(id: string): Promise<DinhKem> {
    const dk = await this.repo.findOne({
      where: { _id: new ObjectId(id) } as any,
    });
    if (!dk) throw new NotFoundException('Không tìm thấy tệp đính kèm');
    return dk;
  }

  async stream(id: string, tenantId: string) {
    const dk = await this.mot(id);
    return {
      dk,
      stream: await this.storage.stream(dk.storageKey, tenantId),
    };
  }

  async xoa(id: string): Promise<void> {
    const dk = await this.mot(id);
    // Xoá bản ghi TRƯỚC, file sau: nếu đổi thứ tự mà bước xoá bản ghi hỏng thì
    // danh sách còn một dòng trỏ vào file đã biến mất — bấm tải về là 404.
    await this.repo.delete({ _id: dk._id } as any);
    await this.storage.delete(dk.storageKey).catch(() => undefined);
  }

  /**
   * Chuyển các đính kèm đã tải lên lúc form còn ở chế độ THÊM (bám id nháp)
   * sang id thật của bản ghi vừa lưu. Trả về số dòng đã chuyển.
   */
  async ganLai(doiTuong: string, tuId: string, sangId: string): Promise<number> {
    if (!doiTuong || !tuId || !sangId) {
      throw new BadRequestException('Thiếu thông tin gán đính kèm');
    }
    const res = await this.repo.update(
      { doiTuong, doiTuongId: tuId } as any,
      { doiTuongId: sangId } as any,
    );
    return res.affected ?? 0;
  }

  /** Xoá sạch đính kèm của một bản ghi — gọi khi bản ghi chủ bị xoá. */
  async xoaTheoDoiTuong(doiTuong: string, doiTuongId: string): Promise<void> {
    const ds = await this.repo.find({
      where: { doiTuong, doiTuongId } as any,
    });
    for (const dk of ds) {
      await this.storage.delete(dk.storageKey).catch(() => undefined);
    }
    if (ds.length) {
      await this.repo.delete({ doiTuong, doiTuongId } as any);
    }
  }
}
