import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { ChuDauTu } from '@app/entities';
import { CreateChuDauTuDto, UpdateChuDauTuDto, ChuDauTuQueryDto } from './dto';
import { PaginatedResult } from '@app/dto';

@Injectable()
export class ChuDauTuService {
  constructor(
    @InjectRepository(ChuDauTu)
    private readonly chuDauTuRepository: Repository<ChuDauTu>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: ChuDauTuQueryDto,
  ): Promise<PaginatedResult<ChuDauTu>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.chuDauTuRepository.find({ where: this.getTenantFilter() as any });
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.ma.toLowerCase().includes(searchLower) ||
          item.ten.toLowerCase().includes(searchLower),
      );
    }

    const total = filteredItems.length;
    const data = filteredItems.slice(skip, skip + limit);

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

  async findAll(): Promise<ChuDauTu[]> {
    const allItems = await this.chuDauTuRepository.find({ where: this.getTenantFilter() as any });
    return allItems.filter((item) => item.isActive !== false);
  }

  async findOne(id: string): Promise<ChuDauTu> {
    const { ObjectId } = await import('mongodb');
    const chuDauTu = await this.chuDauTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chuDauTu) {
      throw new NotFoundException(`Không tìm thấy ChuDauTu với ID ${id}`);
    }

    return chuDauTu;
  }

  async findByMa(ma: string): Promise<ChuDauTu | null> {
    return this.chuDauTuRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateChuDauTuDto): Promise<ChuDauTu> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
    }

    const chuDauTu = this.chuDauTuRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.chuDauTuRepository.save(chuDauTu);
  }

  async update(id: string, updateDto: UpdateChuDauTuDto): Promise<ChuDauTu> {
    const chuDauTu = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== chuDauTu.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(chuDauTu, sanitizeUpdateDto(updateDto));
    return this.chuDauTuRepository.save(chuDauTu);
  }

  async delete(id: string): Promise<void> {
    const chuDauTu = await this.findOne(id);
    chuDauTu.isActive = false;
    await this.chuDauTuRepository.save(chuDauTu);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.chuDauTuRepository as unknown as MongoRepository<ChuDauTu>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<ChuDauTu[]> {
    const allItems = await this.findAll();

    if (!keyword) {
      return allItems.slice(0, limit);
    }

    const searchLower = keyword.toLowerCase();
    return allItems
      .filter(
        (item) =>
          item.ma.toLowerCase().includes(searchLower) ||
          item.ten.toLowerCase().includes(searchLower),
      )
      .slice(0, limit);
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{ total: number }> {
    const allItems = await this.findAll();
    return { total: allItems.length };
  }
}
