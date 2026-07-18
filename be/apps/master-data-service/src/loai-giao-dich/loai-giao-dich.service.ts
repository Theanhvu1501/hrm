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
import { LoaiGiaoDich } from '@app/entities';
import { CreateLoaiGiaoDichDto, UpdateLoaiGiaoDichDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class LoaiGiaoDichService {
  constructor(
    @InjectRepository(LoaiGiaoDich)
    private readonly loaiGiaoDichRepository: Repository<LoaiGiaoDich>,
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
      return this.loaiGiaoDichRepository.count({
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
    return this.loaiGiaoDichRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<LoaiGiaoDich>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate (MongoDB count workaround)
    const allItems = await this.loaiGiaoDichRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<LoaiGiaoDich[]> {
    return this.loaiGiaoDichRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<LoaiGiaoDich> {
    const { ObjectId } = await import('mongodb');
    const loaiGiaoDich = await this.loaiGiaoDichRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!loaiGiaoDich) {
      throw new NotFoundException(`Không tìm thấy LoaiGiaoDich với ID ${id}`);
    }

    return loaiGiaoDich;
  }

  async findByMa(ma: string): Promise<LoaiGiaoDich | null> {
    return this.loaiGiaoDichRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateLoaiGiaoDichDto): Promise<LoaiGiaoDich> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(
        `Mã loại giao dịch ${createDto.ma} đã tồn tại`,
      );
    }

    const loaiGiaoDich = this.loaiGiaoDichRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.loaiGiaoDichRepository.save(loaiGiaoDich);
  }

  async update(id: string, updateDto: UpdateLoaiGiaoDichDto): Promise<LoaiGiaoDich> {
    const loaiGiaoDich = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== loaiGiaoDich.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(
          `Mã loại giao dịch ${updateDto.ma} đã tồn tại`,
        );
      }
    }

    Object.assign(loaiGiaoDich, sanitizeUpdateDto(updateDto));
    return this.loaiGiaoDichRepository.save(loaiGiaoDich);
  }

  async delete(id: string): Promise<void> {
    const loaiGiaoDich = await this.findOne(id);
    loaiGiaoDich.isActive = false;
    await this.loaiGiaoDichRepository.save(loaiGiaoDich);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.loaiGiaoDichRepository as unknown as MongoRepository<LoaiGiaoDich>,
      ids,
    );
  }

  /**
   * Search by keyword using DB query
   */
  async search(keyword: string, limit = 20): Promise<LoaiGiaoDich[]> {
    if (!keyword) {
      return this.loaiGiaoDichRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.loaiGiaoDichRepository.find({
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
   * Check if code already exists
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
    tongLoaiGiaoDich: number;
  }> {
    const allItems = await this.loaiGiaoDichRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    return {
      tongLoaiGiaoDich: activeItems.length,
    };
  }
}
