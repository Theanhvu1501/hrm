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
import { DongTien } from '@app/entities';
import { CreateDongTienDto, UpdateDongTienDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class DongTienService {
  constructor(
    @InjectRepository(DongTien)
    private readonly dongTienRepository: Repository<DongTien>,
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
      return this.dongTienRepository.count({
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
    return this.dongTienRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<DongTien>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate
    const allItems = await this.dongTienRepository.find({ where: this.getTenantFilter() as any });
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

  /**
   * Search cash flows using DB query
   */
  async search(keyword: string, limit = 20): Promise<DongTien[]> {
    if (!keyword) {
      return this.dongTienRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.dongTienRepository.find({
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

  async findAll(): Promise<DongTien[]> {
    return this.dongTienRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<DongTien> {
    const { ObjectId } = await import('mongodb');
    const dongTien = await this.dongTienRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!dongTien) {
      throw new NotFoundException(`Không tìm thấy DongTien với ID ${id}`);
    }

    return dongTien;
  }

  async findByMa(ma: string): Promise<DongTien | null> {
    return this.dongTienRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateDongTienDto): Promise<DongTien> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(
        `Mã dòng tiền ${createDto.ma} đã tồn tại`,
      );
    }

    const dongTien = this.dongTienRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.dongTienRepository.save(dongTien);
  }

  async update(id: string, updateDto: UpdateDongTienDto): Promise<DongTien> {
    const dongTien = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== dongTien.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(
          `Mã dòng tiền ${updateDto.ma} đã tồn tại`,
        );
      }
    }

    Object.assign(dongTien, sanitizeUpdateDto(updateDto));
    return this.dongTienRepository.save(dongTien);
  }

  async delete(id: string): Promise<void> {
    const dongTien = await this.findOne(id);
    dongTien.isActive = false;
    await this.dongTienRepository.save(dongTien);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.dongTienRepository as unknown as MongoRepository<DongTien>,
      ids,
    );
  }

  /**
   * Find by loai using DB query
   */
  async findByLoai(loai: string, limit = 100): Promise<DongTien[]> {
    return this.dongTienRepository.find({
      where: { isActive: true, loai, ...this.getTenantFilter() } as any,
      take: limit,
    });
  }

  /**
   * Check if cash flow code already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  /**
   * Get statistics using DB count queries
   */
  async getStats(): Promise<{
    tongSo: number;
    kinhDoanh: number;
    dauTu: number;
    taiChinh: number;
  }> {
    // Use countBy for simpler queries or count all and filter
    const allItems = await this.dongTienRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const tongSo = activeItems.length;
    const kinhDoanh = activeItems.filter(
      (item) => item.loai === 'KINH_DOANH',
    ).length;
    const dauTu = activeItems.filter((item) => item.loai === 'DAU_TU').length;
    const taiChinh = activeItems.filter(
      (item) => item.loai === 'TAI_CHINH',
    ).length;

    return {
      tongSo,
      kinhDoanh,
      dauTu,
      taiChinh,
    };
  }
}
