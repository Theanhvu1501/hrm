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
import { KhoanMuc } from '@app/entities';
import { CreateKhoanMucDto, UpdateKhoanMucDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class KhoanMucService {
  constructor(
    @InjectRepository(KhoanMuc)
    private readonly khoanMucRepository: Repository<KhoanMuc>,
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
      return this.khoanMucRepository.count({
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
    return this.khoanMucRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(
    query: PaginationQueryDto & { loai?: string },
  ): Promise<PaginatedResult<KhoanMuc>> {
    const { page = 1, limit = 10, search, loai } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate
    const allItems = await this.khoanMucRepository.find({ where: this.getTenantFilter() as any });
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (loai) {
      filteredItems = filteredItems.filter((item) => item.loai === loai);
    }

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

  /**
   * Search categories using DB query
   */
  async search(keyword: string, limit = 20): Promise<KhoanMuc[]> {
    if (!keyword) {
      return this.khoanMucRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.khoanMucRepository.find({
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

  async findAll(): Promise<KhoanMuc[]> {
    return this.khoanMucRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<KhoanMuc> {
    const { ObjectId } = await import('mongodb');
    const khoanMuc = await this.khoanMucRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!khoanMuc) {
      throw new NotFoundException(`Không tìm thấy KhoanMuc với ID ${id}`);
    }

    return khoanMuc;
  }

  async findByMa(ma: string): Promise<KhoanMuc | null> {
    return this.khoanMucRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateKhoanMucDto): Promise<KhoanMuc> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(
        `Mã khoản mục ${createDto.ma} đã tồn tại`,
      );
    }

    const khoanMuc = this.khoanMucRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.khoanMucRepository.save(khoanMuc);
  }

  async update(id: string, updateDto: UpdateKhoanMucDto): Promise<KhoanMuc> {
    const khoanMuc = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== khoanMuc.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(
          `Mã khoản mục ${updateDto.ma} đã tồn tại`,
        );
      }
    }

    Object.assign(khoanMuc, sanitizeUpdateDto(updateDto));
    return this.khoanMucRepository.save(khoanMuc);
  }

  async delete(id: string): Promise<void> {
    const khoanMuc = await this.findOne(id);
    khoanMuc.isActive = false;
    await this.khoanMucRepository.save(khoanMuc);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.khoanMucRepository as unknown as MongoRepository<KhoanMuc>,
      ids,
    );
  }

  /**
   * Find by loai using DB query
   */
  async findByLoai(loai: string, limit = 100): Promise<KhoanMuc[]> {
    const allItems = await this.khoanMucRepository.find({ where: this.getTenantFilter() as any });
    return allItems
      .filter((item) => item.isActive !== false && item.loai === loai)
      .slice(0, limit);
  }

  /**
   * Check if category code already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    tongKhoanMuc: number;
    chiPhi: number;
    doanhThu: number;
  }> {
    const allItems = await this.khoanMucRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const tongKhoanMuc = activeItems.length;
    const chiPhi = activeItems.filter((item) => item.loai === 'CHI_PHI').length;
    const doanhThu = activeItems.filter(
      (item) => item.loai === 'DOANH_THU',
    ).length;

    return {
      tongKhoanMuc,
      chiPhi,
      doanhThu,
    };
  }
}
