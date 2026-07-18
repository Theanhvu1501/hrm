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
import { NhomVatTu } from '@app/entities';
import { CreateNhomVatTuDto, UpdateNhomVatTuDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class NhomVatTuService {
  constructor(
    @InjectRepository(NhomVatTu)
    private readonly nhomVatTuRepository: Repository<NhomVatTu>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.nhomVatTuRepository.count({
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
    return this.nhomVatTuRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<NhomVatTu>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.nhomVatTuRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<NhomVatTu[]> {
    return this.nhomVatTuRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<NhomVatTu> {
    const { ObjectId } = await import('mongodb');
    const nhomVatTu = await this.nhomVatTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!nhomVatTu) {
      throw new NotFoundException(`Không tìm thấy NhomVatTu với ID ${id}`);
    }

    return nhomVatTu;
  }

  async findByMa(ma: string): Promise<NhomVatTu | null> {
    return this.nhomVatTuRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateNhomVatTuDto): Promise<NhomVatTu> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã nhóm vật tư ${createDto.ma} đã tồn tại`);
    }

    const nhomVatTu = this.nhomVatTuRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nhomVatTuRepository.save(nhomVatTu);
  }

  async update(id: string, updateDto: UpdateNhomVatTuDto): Promise<NhomVatTu> {
    const nhomVatTu = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== nhomVatTu.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã nhóm vật tư ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(nhomVatTu, sanitizeUpdateDto(updateDto));
    return this.nhomVatTuRepository.save(nhomVatTu);
  }

  async delete(id: string): Promise<void> {
    const nhomVatTu = await this.findOne(id);
    nhomVatTu.isActive = false;
    await this.nhomVatTuRepository.save(nhomVatTu);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.nhomVatTuRepository as unknown as MongoRepository<NhomVatTu>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<NhomVatTu[]> {
    if (!keyword) {
      return this.nhomVatTuRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.nhomVatTuRepository.find({
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
    const allItems = await this.nhomVatTuRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);
    return { tong: activeItems.length };
  }
}
