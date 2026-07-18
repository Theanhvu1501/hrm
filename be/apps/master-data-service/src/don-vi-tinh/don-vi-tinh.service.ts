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
import { DonViTinh } from '@app/entities';
import { CreateDonViTinhDto, UpdateDonViTinhDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class DonViTinhService {
  constructor(
    @InjectRepository(DonViTinh)
    private readonly donViTinhRepository: Repository<DonViTinh>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.donViTinhRepository.count({
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
    return this.donViTinhRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<DonViTinh>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.donViTinhRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<DonViTinh[]> {
    return this.donViTinhRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<DonViTinh> {
    const { ObjectId } = await import('mongodb');
    const donViTinh = await this.donViTinhRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!donViTinh) {
      throw new NotFoundException(`Không tìm thấy DonViTinh với ID ${id}`);
    }

    return donViTinh;
  }

  async findByMa(ma: string): Promise<DonViTinh | null> {
    return this.donViTinhRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateDonViTinhDto): Promise<DonViTinh> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã đơn vị tính ${createDto.ma} đã tồn tại`);
    }

    const donViTinh = this.donViTinhRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.donViTinhRepository.save(donViTinh);
  }

  async update(id: string, updateDto: UpdateDonViTinhDto): Promise<DonViTinh> {
    const donViTinh = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== donViTinh.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã đơn vị tính ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(donViTinh, sanitizeUpdateDto(updateDto));
    return this.donViTinhRepository.save(donViTinh);
  }

  async delete(id: string): Promise<void> {
    const donViTinh = await this.findOne(id);
    donViTinh.isActive = false;
    await this.donViTinhRepository.save(donViTinh);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.donViTinhRepository as unknown as MongoRepository<DonViTinh>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<DonViTinh[]> {
    if (!keyword) {
      return this.donViTinhRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.donViTinhRepository.find({
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

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{ tong: number }> {
    const allItems = await this.donViTinhRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);
    return { tong: activeItems.length };
  }
}
