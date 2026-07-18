import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { DiemDanhAn } from '@app/entities';
import { CreateDiemDanhAnDto, UpdateDiemDanhAnDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class DiemDanhAnService {
  constructor(
    @InjectRepository(DiemDanhAn) private readonly repo: Repository<DiemDanhAn>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<DiemDanhAn>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    let items = all.filter((i) => i.isActive !== false);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((i) => (i.lopTen || '').toLowerCase().includes(s) || (i.lopMa || '').toLowerCase().includes(s));
    }
    const total = items.length;
    return { data: items.slice(skip, skip + limit), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAll(): Promise<DiemDanhAn[]> {
    return this.repo.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<DiemDanhAn> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy DiemDanhAn với ID ${id}`);
    return item;
  }

  async create(dto: CreateDiemDanhAnDto): Promise<DiemDanhAn> {
    const item = this.repo.create({ ...dto, ngay: new Date(dto.ngay), isActive: true } as any);
    return this.repo.save(item) as any;
  }

  async update(id: string, dto: UpdateDiemDanhAnDto): Promise<DiemDanhAn> {
    const item = await this.findOne(id);
    const patch: any = sanitizeUpdateDto(dto);
    if (patch.ngay) patch.ngay = new Date(patch.ngay);
    Object.assign(item, patch);
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
      this.repo as unknown as MongoRepository<DiemDanhAn>,
      ids,
    );
  }

  async getStats(): Promise<{ tong: number }> {
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    return { tong: all.filter((i) => i.isActive !== false).length };
  }
}
