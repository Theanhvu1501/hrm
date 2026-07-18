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
import { NganHang } from '@app/entities';
import { CreateNganHangDto, UpdateNganHangDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class NganHangService {
  constructor(
    @InjectRepository(NganHang)
    private readonly nganHangRepository: Repository<NganHang>,
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
      return this.nganHangRepository.count({
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
    return this.nganHangRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(
    query: PaginationQueryDto & { loai?: string },
  ): Promise<PaginatedResult<NganHang>> {
    const { page = 1, limit = 10, search, loai } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate (MongoDB count workaround)
    const allItems = await this.nganHangRepository.find({ where: this.getTenantFilter() as any });
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (loai) {
      filteredItems = filteredItems.filter((item) => item.loai === loai);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter((item) =>
        [
          item.ma,
          item.ten,
          item.soTaiKhoan,
          item.nganHang,
          item.chiNhanh,
          item.chuTaiKhoan,
        ].some((field) => field?.toLowerCase().includes(searchLower)),
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
   * Search banks using DB query
   */
  async search(keyword: string, limit = 20): Promise<NganHang[]> {
    if (!keyword) {
      return this.nganHangRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.nganHangRepository.find({
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

  async findAll(): Promise<NganHang[]> {
    return this.nganHangRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<NganHang> {
    const { ObjectId } = await import('mongodb');
    const nganHang = await this.nganHangRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!nganHang) {
      throw new NotFoundException(`Không tìm thấy NganHang với ID ${id}`);
    }

    return nganHang;
  }

  async findByMa(ma: string): Promise<NganHang | null> {
    return this.nganHangRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateNganHangDto): Promise<NganHang> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ngân hàng ${createDto.ma} đã tồn tại`);
    }

    const nganHang = this.nganHangRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nganHangRepository.save(nganHang);
  }

  async update(id: string, updateDto: UpdateNganHangDto): Promise<NganHang> {
    const nganHang = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== nganHang.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ngân hàng ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(nganHang, sanitizeUpdateDto(updateDto));
    return this.nganHangRepository.save(nganHang);
  }

  async delete(id: string): Promise<void> {
    const nganHang = await this.findOne(id);
    nganHang.isActive = false;
    await this.nganHangRepository.save(nganHang);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.nganHangRepository as unknown as MongoRepository<NganHang>,
      ids,
    );
  }

  /**
   * Check if bank code already exists
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
    tongNganHang: number;
    nganHang: number;
    tienMat: number;
  }> {
    const allItems = await this.nganHangRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const tongNganHang = activeItems.length;
    const nganHang = activeItems.filter(
      (item) => item.loai === 'NGAN_HANG',
    ).length;
    const tienMat = activeItems.filter(
      (item) => item.loai === 'TIEN_MAT',
    ).length;

    return {
      tongNganHang,
      nganHang,
      tienMat,
    };
  }
}
