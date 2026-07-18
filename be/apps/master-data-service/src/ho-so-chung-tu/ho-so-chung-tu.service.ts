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
import { HoSoChungTu } from '@app/entities';
import { CreateHoSoChungTuDto, UpdateHoSoChungTuDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class HoSoChungTuService {
  constructor(
    @InjectRepository(HoSoChungTu)
    private readonly hoSoChungTuRepository: Repository<HoSoChungTu>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAll(): Promise<HoSoChungTu[]> {
    return this.hoSoChungTuRepository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<HoSoChungTu>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.hoSoChungTuRepository.find({
      where: this.getTenantFilter() as any,
    });
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

  async search(keyword: string, limit = 20): Promise<HoSoChungTu[]> {
    if (!keyword) {
      return this.hoSoChungTuRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.hoSoChungTuRepository.find({
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

  async findOne(id: string): Promise<HoSoChungTu> {
    const { ObjectId } = await import('mongodb');
    const hoSoChungTu = await this.hoSoChungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!hoSoChungTu) {
      throw new NotFoundException(`Không tìm thấy HoSoChungTu với ID ${id}`);
    }

    return hoSoChungTu;
  }

  async findByMa(ma: string): Promise<HoSoChungTu | null> {
    const result = await this.hoSoChungTuRepository.findOne({
      where: { ma, isActive: true, ...this.getTenantFilter() },
    });
    return result ?? null;
  }

  async create(createDto: CreateHoSoChungTuDto): Promise<HoSoChungTu> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
    }
    const item = this.hoSoChungTuRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.hoSoChungTuRepository.save(item);
  }

  async update(
    id: string,
    updateDto: UpdateHoSoChungTuDto,
  ): Promise<HoSoChungTu> {
    const hoSoChungTu = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== hoSoChungTu.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(hoSoChungTu, sanitizeUpdateDto(updateDto));
    return this.hoSoChungTuRepository.save(hoSoChungTu);
  }

  async delete(id: string): Promise<void> {
    const hoSoChungTu = await this.findOne(id);
    hoSoChungTu.isActive = false;
    await this.hoSoChungTuRepository.save(hoSoChungTu);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.hoSoChungTuRepository as unknown as MongoRepository<HoSoChungTu>,
      ids,
    );
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }
}
