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
import { SanPham } from '@app/entities';
import { CreateSanPhamDto, UpdateSanPhamDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class SanPhamService {
  constructor(
    @InjectRepository(SanPham)
    private readonly sanPhamRepository: Repository<SanPham>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  /**
   * Get total count using DB query
   */
  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.sanPhamRepository.count({
        where: {
          isActive: true,
          ...this.getTenantFilter(),
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
          ],
        } as any,
      });
    }
    return this.sanPhamRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<SanPham>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate (MongoDB count workaround)
    const allItems = await this.sanPhamRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<SanPham[]> {
    return this.sanPhamRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<SanPham> {
    const { ObjectId } = await import('mongodb');
    const sanPham = await this.sanPhamRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!sanPham) {
      throw new NotFoundException(`Không tìm thấy SanPham với ID ${id}`);
    }

    return sanPham;
  }

  async findByMa(ma: string): Promise<SanPham | null> {
    return this.sanPhamRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateSanPhamDto): Promise<SanPham> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(
        `Mã sản phẩm ${createDto.ma} đã tồn tại`,
      );
    }

    const sanPham = this.sanPhamRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.sanPhamRepository.save(sanPham);
  }

  async update(id: string, updateDto: UpdateSanPhamDto): Promise<SanPham> {
    const sanPham = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== sanPham.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(
          `Mã sản phẩm ${updateDto.ma} đã tồn tại`,
        );
      }
    }

    Object.assign(sanPham, sanitizeUpdateDto(updateDto));
    return this.sanPhamRepository.save(sanPham);
  }

  async delete(id: string): Promise<void> {
    const sanPham = await this.findOne(id);
    sanPham.isActive = false;
    await this.sanPhamRepository.save(sanPham);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.sanPhamRepository as unknown as MongoRepository<SanPham>,
      ids,
    );
  }

  /**
   * Search products using DB query
   */
  async search(keyword: string, limit = 20): Promise<SanPham[]> {
    if (!keyword) {
      return this.sanPhamRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.sanPhamRepository.find({
      where: {
        isActive: true,
        ...this.getTenantFilter(),
        $or: [
          { ma: { $regex: searchRegex } },
          { ten: { $regex: searchRegex } },
        ],
      } as any,
      take: limit,
    });
  }

  /**
   * Check if product code already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  /**
   * Get statistics using filter (MongoDB count workaround)
   */
  async getStats(): Promise<{
    tongSanPham: number;
    coGiaBan: number;
    chuaCoGia: number;
  }> {
    const allItems = await this.sanPhamRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const tongSanPham = activeItems.length;
    const coGiaBan = activeItems.filter(
      (item) => item.giaBan && item.giaBan > 0,
    ).length;

    return {
      tongSanPham,
      coGiaBan,
      chuaCoGia: tongSanPham - coGiaBan,
    };
  }
}
