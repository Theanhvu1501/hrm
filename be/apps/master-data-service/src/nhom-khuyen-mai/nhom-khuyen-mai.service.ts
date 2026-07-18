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
import { NhomKhuyenMai } from '@app/entities';
import {
  CreateNhomKhuyenMaiDto,
  UpdateNhomKhuyenMaiDto,
  NhomKhuyenMaiQueryDto,
} from './dto';
import { PaginatedResult } from '@app/dto';

@Injectable()
export class NhomKhuyenMaiService {
  constructor(
    @InjectRepository(NhomKhuyenMai)
    private readonly nhomKhuyenMaiRepository: Repository<NhomKhuyenMai>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: NhomKhuyenMaiQueryDto,
  ): Promise<PaginatedResult<NhomKhuyenMai>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.nhomKhuyenMaiRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<NhomKhuyenMai[]> {
    const allItems = await this.nhomKhuyenMaiRepository.find({ where: this.getTenantFilter() as any });
    return allItems.filter((item) => item.isActive !== false);
  }

  async findOne(id: string): Promise<NhomKhuyenMai> {
    const { ObjectId } = await import('mongodb');
    const nhomKhuyenMai = await this.nhomKhuyenMaiRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!nhomKhuyenMai) {
      throw new NotFoundException(`Không tìm thấy NhomKhuyenMai với ID ${id}`);
    }

    return nhomKhuyenMai;
  }

  async findByMa(ma: string): Promise<NhomKhuyenMai | null> {
    return this.nhomKhuyenMaiRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateNhomKhuyenMaiDto): Promise<NhomKhuyenMai> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
    }

    const nhomKhuyenMai = this.nhomKhuyenMaiRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nhomKhuyenMaiRepository.save(nhomKhuyenMai);
  }

  async update(
    id: string,
    updateDto: UpdateNhomKhuyenMaiDto,
  ): Promise<NhomKhuyenMai> {
    const nhomKhuyenMai = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== nhomKhuyenMai.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(nhomKhuyenMai, sanitizeUpdateDto(updateDto));
    return this.nhomKhuyenMaiRepository.save(nhomKhuyenMai);
  }

  async delete(id: string): Promise<void> {
    const nhomKhuyenMai = await this.findOne(id);
    nhomKhuyenMai.isActive = false;
    await this.nhomKhuyenMaiRepository.save(nhomKhuyenMai);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.nhomKhuyenMaiRepository as unknown as MongoRepository<NhomKhuyenMai>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<NhomKhuyenMai[]> {
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
