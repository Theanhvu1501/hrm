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
import { DoiTuong, DoiTuongType } from '@app/entities';
import { CreateDoiTuongDto, UpdateDoiTuongDto } from './dto';
import type { CreateDoiTuongDto as CreateDoiTuongDtoType } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class DoiTuongService {
  constructor(
    @InjectRepository(DoiTuong)
    private readonly doiTuongRepository: Repository<DoiTuong>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  /**
   * Build where conditions for queries
   */
  private buildWhereConditions(search?: string, loai?: DoiTuongType): any {
    const where: any = { isActive: true, ...this.getTenantFilter() };
    if (loai) {
      where.loai = loai;
    }
    return where;
  }

  /**
   * Get total count using DB query
   */
  async getTotal(search?: string, loai?: DoiTuongType): Promise<number> {
    const baseWhere = this.buildWhereConditions(undefined, loai);

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.doiTuongRepository.count({
        where: {
          ...baseWhere,
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { soDienThoai: { $regex: searchRegex } },
          ],
        },
      });
    }
    return this.doiTuongRepository.count({ where: baseWhere });
  }

  async findAllPaginated(
    query: PaginationQueryDto & { loai?: DoiTuongType },
  ): Promise<PaginatedResult<DoiTuong>> {
    const { page = 1, limit = 10, search, loai } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate (MongoDB count workaround)
    const allItems = await this.doiTuongRepository.find({ where: this.getTenantFilter() as any });
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (loai) {
      filteredItems = filteredItems.filter((item) => item.loai?.includes(loai));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.ma.toLowerCase().includes(searchLower) ||
          item.ten.toLowerCase().includes(searchLower) ||
          (item.email && item.email.toLowerCase().includes(searchLower)) ||
          (item.soDienThoai &&
            item.soDienThoai.toLowerCase().includes(searchLower)),
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

  async findAll(loai?: DoiTuongType): Promise<DoiTuong[]> {
    const where: any = { isActive: true, ...this.getTenantFilter() };
    if (loai) {
      where.loai = loai;
    }
    return this.doiTuongRepository.find({ where });
  }

  async findOne(id: string): Promise<DoiTuong> {
    const { ObjectId } = await import('mongodb');
    const doiTuong = await this.doiTuongRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!doiTuong) {
      throw new NotFoundException(`Không tìm thấy DoiTuong với ID ${id}`);
    }

    return doiTuong;
  }

  async findByMa(ma: string): Promise<DoiTuong | null> {
    return this.doiTuongRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateDoiTuongDto): Promise<DoiTuong> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã đối tượng ${createDto.ma} đã tồn tại`);
    }

    const doiTuong = this.doiTuongRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.doiTuongRepository.save(doiTuong);
  }

  async update(id: string, updateDto: UpdateDoiTuongDto): Promise<DoiTuong> {
    const doiTuong = await this.findOne(id);

    const dto = updateDto as Partial<CreateDoiTuongDtoType>;
    if (dto.ma && dto.ma !== doiTuong.ma) {
      const existing = await this.findByMa(dto.ma);
      if (existing) {
        throw new ConflictException(`Mã đối tượng ${dto.ma} đã tồn tại`);
      }
    }

    Object.assign(doiTuong, sanitizeUpdateDto(updateDto));
    return this.doiTuongRepository.save(doiTuong);
  }

  async delete(id: string): Promise<void> {
    const doiTuong = await this.findOne(id);
    doiTuong.isActive = false;
    await this.doiTuongRepository.save(doiTuong);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.doiTuongRepository as unknown as MongoRepository<DoiTuong>,
      ids,
    );
  }

  /**
   * Search entities by keyword using DB query
   */
  async search(
    keyword: string,
    loai?: DoiTuongType,
    limit = 20,
  ): Promise<DoiTuong[]> {
    const baseWhere: any = { isActive: true, ...this.getTenantFilter() };
    if (loai) {
      baseWhere.loai = loai;
    }

    if (!keyword) {
      return this.doiTuongRepository.find({
        where: baseWhere,
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.doiTuongRepository.find({
      where: {
        ...baseWhere,
        $or: [
          { ma: { $regex: searchRegex } },
          { ten: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
          { soDienThoai: { $regex: searchRegex } },
        ],
      },
      take: limit,
    });
  }

  /**
   * Check if entity code already exists
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
    tongDoiTuong: number;
    khachHang: number;
    nhaCungCap: number;
    nhanVien: number;
    nhaThau: number;
  }> {
    const allItems = await this.doiTuongRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const tongDoiTuong = activeItems.length;
    const khachHang = activeItems.filter(
      (item) => item.loai?.includes(DoiTuongType.KHACH_HANG),
    ).length;
    const nhaCungCap = activeItems.filter(
      (item) => item.loai?.includes(DoiTuongType.NHA_CUNG_CAP),
    ).length;
    const nhanVien = activeItems.filter(
      (item) => item.loai?.includes(DoiTuongType.NHAN_VIEN),
    ).length;
    const nhaThau = activeItems.filter(
      (item) => item.loai?.includes(DoiTuongType.NHA_THAU),
    ).length;

    return {
      tongDoiTuong,
      khachHang,
      nhaCungCap,
      nhanVien,
      nhaThau,
    };
  }
}
