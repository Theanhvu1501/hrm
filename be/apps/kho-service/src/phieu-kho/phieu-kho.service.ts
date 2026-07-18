import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { PhieuKho } from '@app/entities';
import {
  TenantContextService,
  sanitizeUpdateDto,
  softDeleteBatch,
  type SoftDeleteBatchResult,
} from '@app/core';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';
import { CreatePhieuKhoDto, UpdatePhieuKhoDto } from './dto';
import { PhieuKhoSequenceService } from './phieu-kho-sequence.service';

export interface PhieuKhoQuery extends PaginationQueryDto {
  loaiPhieu?: string;
  tuNgay?: string;
  denNgay?: string;
}

@Injectable()
export class PhieuKhoService {
  constructor(
    @InjectRepository(PhieuKho)
    private readonly repo: Repository<PhieuKho>,
    private readonly tenantContext: TenantContextService,
    private readonly sequenceService: PhieuKhoSequenceService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(query: PhieuKhoQuery): Promise<PaginatedResult<PhieuKho>> {
    const { page = 1, limit = 10, search, loaiPhieu, tuNgay, denNgay } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.repo.find({ where: { isActive: true, ...this.getTenantFilter() } as any });

    let filtered = allItems;

    if (loaiPhieu) {
      filtered = filtered.filter((item) => item.loaiPhieu === loaiPhieu);
    }

    if (tuNgay) {
      const from = new Date(tuNgay);
      filtered = filtered.filter((item) => new Date(item.ngayHachToan) >= from);
    }

    if (denNgay) {
      const to = new Date(denNgay);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => new Date(item.ngayHachToan) <= to);
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.soPhieu ?? '').toLowerCase().includes(s) ||
          (item.doiTuongTen ?? '').toLowerCase().includes(s) ||
          (item.dienGiai ?? '').toLowerCase().includes(s),
      );
    }

    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PhieuKho> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy PhieuKho với ID ${id}`);
    return item;
  }

  async create(dto: CreatePhieuKhoDto): Promise<PhieuKho> {
    let soPhieu = dto.soPhieu;
    if (!soPhieu) {
      soPhieu = await this.sequenceService.next(dto.loaiPhieu);
    }

    let tongTien = dto.tongTien;
    if (tongTien === undefined || tongTien === null) {
      tongTien = (dto.chiTiet ?? []).reduce((sum, ct) => sum + (ct.thanhTien ?? 0), 0);
    }

    const entity = this.repo.create({
      ...dto,
      soPhieu,
      tongTien,
      isActive: true,
      ...this.getTenantFilter(),
    } as any) as unknown as PhieuKho;

    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdatePhieuKhoDto): Promise<PhieuKho> {
    const item = await this.findOne(id);

    // Recompute tongTien if chiTiet changes but tongTien not provided
    if (dto.chiTiet !== undefined && dto.tongTien === undefined) {
      (dto as any).tongTien = dto.chiTiet.reduce((sum, ct) => sum + (ct.thanhTien ?? 0), 0);
    }

    Object.assign(item, sanitizeUpdateDto(dto));
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repo as unknown as MongoRepository<PhieuKho>,
      ids,
    );
  }

  async getStats(loaiPhieu?: string): Promise<{ tongPhieu: number; tongTien: number }> {
    const allItems = await this.repo.find({ where: { isActive: true, ...this.getTenantFilter() } as any });
    const filtered = loaiPhieu ? allItems.filter((i) => i.loaiPhieu === loaiPhieu) : allItems;
    const tongPhieu = filtered.length;
    const tongTien = filtered.reduce((sum, i) => sum + (Number(i.tongTien) || 0), 0);
    return { tongPhieu, tongTien };
  }

  async getNextSo(loaiPhieu: string): Promise<string> {
    return this.sequenceService.peek(loaiPhieu);
  }
}
