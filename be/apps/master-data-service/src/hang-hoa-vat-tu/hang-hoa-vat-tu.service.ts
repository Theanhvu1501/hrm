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
import { HangHoaVatTu, TinhChatVatTu } from '@app/entities';
import { CreateHangHoaVatTuDto, UpdateHangHoaVatTuDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class HangHoaVatTuService {
  constructor(
    @InjectRepository(HangHoaVatTu)
    private readonly hangHoaVatTuRepository: Repository<HangHoaVatTu>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.hangHoaVatTuRepository.count({
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
    return this.hangHoaVatTuRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<HangHoaVatTu>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.hangHoaVatTuRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<HangHoaVatTu[]> {
    return this.hangHoaVatTuRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<HangHoaVatTu> {
    const { ObjectId } = await import('mongodb');
    const hangHoaVatTu = await this.hangHoaVatTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!hangHoaVatTu) {
      throw new NotFoundException(`Không tìm thấy HangHoaVatTu với ID ${id}`);
    }

    return hangHoaVatTu;
  }

  async findByMa(ma: string): Promise<HangHoaVatTu | null> {
    return this.hangHoaVatTuRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateHangHoaVatTuDto): Promise<HangHoaVatTu> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã hàng hóa vật tư ${createDto.ma} đã tồn tại`);
    }

    const hangHoaVatTu = this.hangHoaVatTuRepository.create({
      ...createDto,
      tinhChat: createDto.tinhChat as TinhChatVatTu | undefined,
      isActive: true,
    });
    return this.hangHoaVatTuRepository.save(hangHoaVatTu);
  }

  async update(id: string, updateDto: UpdateHangHoaVatTuDto): Promise<HangHoaVatTu> {
    const hangHoaVatTu = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== hangHoaVatTu.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã hàng hóa vật tư ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(hangHoaVatTu, sanitizeUpdateDto(updateDto));
    return this.hangHoaVatTuRepository.save(hangHoaVatTu);
  }

  async delete(id: string): Promise<void> {
    const hangHoaVatTu = await this.findOne(id);
    hangHoaVatTu.isActive = false;
    await this.hangHoaVatTuRepository.save(hangHoaVatTu);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.hangHoaVatTuRepository as unknown as MongoRepository<HangHoaVatTu>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<HangHoaVatTu[]> {
    if (!keyword) {
      return this.hangHoaVatTuRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.hangHoaVatTuRepository.find({
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

  async getStats(): Promise<{ tong: number; theoTinhChat: Record<string, number> }> {
    const allItems = await this.hangHoaVatTuRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const theoTinhChat: Record<string, number> = {};
    for (const item of activeItems) {
      const key = item.tinhChat || 'KHAC';
      theoTinhChat[key] = (theoTinhChat[key] || 0) + 1;
    }

    return {
      tong: activeItems.length,
      theoTinhChat,
    };
  }
}
