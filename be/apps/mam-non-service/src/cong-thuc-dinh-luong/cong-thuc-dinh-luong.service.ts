import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { CongThucDinhLuong } from '@app/entities';
import { CreateCongThucDinhLuongDto, UpdateCongThucDinhLuongDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class CongThucDinhLuongService {
  constructor(
    @InjectRepository(CongThucDinhLuong)
    private readonly repo: Repository<CongThucDinhLuong>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<CongThucDinhLuong>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const allItems = await this.repo.find({
      where: this.getTenantFilter() as any,
    });
    let items = allItems.filter((i) => i.isActive !== false);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.code.toLowerCase().includes(s) || i.ten.toLowerCase().includes(s),
      );
    }
    const total = items.length;
    return {
      data: items.slice(skip, skip + limit),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(): Promise<CongThucDinhLuong[]> {
    return this.repo.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
  }

  async findOne(id: string): Promise<CongThucDinhLuong> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!item)
      throw new NotFoundException(
        `Không tìm thấy CongThucDinhLuong với ID ${id}`,
      );
    return item;
  }

  async findByCode(code: string): Promise<CongThucDinhLuong | null> {
    return this.repo.findOne({
      where: { code, isActive: true, ...this.getTenantFilter() },
    });
  }

  async create(dto: CreateCongThucDinhLuongDto): Promise<CongThucDinhLuong> {
    if (await this.findByCode(dto.code))
      throw new ConflictException(`Mã ${dto.code} đã tồn tại`);
    const item = this.repo.create({ ...dto, isActive: true } as any);
    return this.repo.save(item) as any;
  }

  async update(
    id: string,
    dto: UpdateCongThucDinhLuongDto,
  ): Promise<CongThucDinhLuong> {
    const item = await this.findOne(id);
    if (
      dto.code &&
      dto.code !== item.code &&
      (await this.findByCode(dto.code))
    )
      throw new ConflictException(`Mã ${dto.code} đã tồn tại`);
    Object.assign(item, sanitizeUpdateDto(dto));
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
      this.repo as unknown as MongoRepository<CongThucDinhLuong>,
      ids,
    );
  }

  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByCode(code);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{ tong: number }> {
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    return { tong: all.filter((i) => i.isActive !== false).length };
  }
}
