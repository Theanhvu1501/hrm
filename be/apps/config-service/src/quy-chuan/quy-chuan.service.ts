import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { QuyChuan } from '@app/entities';
import { softDeleteBatch, type SoftDeleteBatchResult } from '@app/core';

export interface QuyChaunStats {
  tongQuyChuan: number;
  phieuThu: number;
  phieuChi: number;
  baoCo: number;
  baoNo: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  keyword?: string;
  loaiGiaoDich?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class QuyChuan_Service {
  constructor(
    @InjectRepository(QuyChuan)
    private readonly repo: Repository<QuyChuan>,
  ) {}

  async findAll(): Promise<QuyChuan[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { _id: 'ASC' } as any,
    });
  }

  async findAllPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResult<QuyChuan>> {
    const { page = 1, limit = 10, keyword, loaiGiaoDich } = params;

    // Get all active records first, sorted by _id
    let data = await this.repo.find({
      where: { isActive: true },
      order: { _id: 'ASC' } as any,
    });

    // Filter by loaiGiaoDich if provided
    if (loaiGiaoDich) {
      data = data.filter((qc) => qc.loaiGiaoDich === loaiGiaoDich);
    }

    // Filter by keyword if provided
    if (keyword && keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      data = data.filter(
        (qc) =>
          qc.nghiepVu.toLowerCase().includes(lowerKeyword) ||
          qc.taiKhoanNo.includes(lowerKeyword) ||
          qc.taiKhoanCo.includes(lowerKeyword) ||
          (qc.moTa && qc.moTa.toLowerCase().includes(lowerKeyword)),
      );
    }

    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Apply pagination
    const paginatedData = data.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<QuyChuan> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy quy chuẩn với ID ${id}`);
    }

    return item;
  }

  async findByLoaiGiaoDich(loaiGiaoDich: string): Promise<QuyChuan[]> {
    return this.repo.find({ where: { loaiGiaoDich, isActive: true } });
  }

  async findByNghiepVu(nghiepVu: string): Promise<QuyChuan | null> {
    return this.repo.findOne({ where: { nghiepVu, isActive: true } });
  }

  async search(keyword: string): Promise<QuyChuan[]> {
    const all = await this.findAll();
    const lowerKeyword = keyword.toLowerCase();
    return all.filter(
      (qc) =>
        qc.nghiepVu.toLowerCase().includes(lowerKeyword) ||
        qc.taiKhoanNo.includes(lowerKeyword) ||
        qc.taiKhoanCo.includes(lowerKeyword) ||
        (qc.moTa && qc.moTa.toLowerCase().includes(lowerKeyword)),
    );
  }

  async getStats(keyword?: string): Promise<QuyChaunStats> {
    let data = await this.findAll();

    // Filter by keyword if provided
    if (keyword && keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      data = data.filter(
        (qc) =>
          qc.nghiepVu.toLowerCase().includes(lowerKeyword) ||
          qc.taiKhoanNo.includes(lowerKeyword) ||
          qc.taiKhoanCo.includes(lowerKeyword) ||
          (qc.moTa && qc.moTa.toLowerCase().includes(lowerKeyword)),
      );
    }

    return {
      tongQuyChuan: data.length,
      phieuThu: data.filter((qc) => qc.loaiGiaoDich === 'PHIEU_THU').length,
      phieuChi: data.filter((qc) => qc.loaiGiaoDich === 'PHIEU_CHI').length,
      baoCo: data.filter((qc) => qc.loaiGiaoDich === 'BAO_CO').length,
      baoNo: data.filter((qc) => qc.loaiGiaoDich === 'BAO_NO').length,
    };
  }

  async getSuggestedAccounts(
    loaiGiaoDich: string,
    nghiepVu: string,
  ): Promise<{ taiKhoanNo: string; taiKhoanCo: string } | null> {
    const match = await this.repo.findOne({
      where: { loaiGiaoDich, nghiepVu, isActive: true },
    });
    if (match) {
      return { taiKhoanNo: match.taiKhoanNo, taiKhoanCo: match.taiKhoanCo };
    }
    return null;
  }

  async duplicateCheck(
    loaiGiaoDich: string,
    nghiepVu: string,
    excludeId?: string,
  ): Promise<boolean> {
    const all = await this.findAll();
    return all.some(
      (qc) =>
        qc.loaiGiaoDich === loaiGiaoDich &&
        qc.nghiepVu === nghiepVu &&
        (qc as any)._id?.toString() !== excludeId,
    );
  }

  async create(data: Partial<QuyChuan>): Promise<QuyChuan> {
    if (data.nghiepVu && data.loaiGiaoDich) {
      const isDuplicate = await this.duplicateCheck(
        data.loaiGiaoDich,
        data.nghiepVu,
      );
      if (isDuplicate) {
        throw new ConflictException(
          `QuyChuan with loaiGiaoDich ${data.loaiGiaoDich} and nghiepVu ${data.nghiepVu} already exists`,
        );
      }
    }

    const item = this.repo.create({
      ...data,
      isActive: true,
    });
    return this.repo.save(item);
  }

  async update(id: string, data: Partial<QuyChuan>): Promise<QuyChuan> {
    const item = await this.findOne(id);

    if (data.nghiepVu && data.loaiGiaoDich) {
      const isDuplicate = await this.duplicateCheck(
        data.loaiGiaoDich,
        data.nghiepVu,
        id,
      );
      if (isDuplicate) {
        throw new ConflictException(
          `QuyChuan with loaiGiaoDich ${data.loaiGiaoDich} and nghiepVu ${data.nghiepVu} already exists`,
        );
      }
    }

    Object.assign(item, data);
    return this.repo.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repo as unknown as MongoRepository<QuyChuan>,
      ids,
    );
  }
}
