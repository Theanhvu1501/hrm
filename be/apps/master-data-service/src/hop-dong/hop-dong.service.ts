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
import { HopDong, TrangThaiHopDong } from '@app/entities';
import { CreateHopDongDto, UpdateHopDongDto, HopDongQueryDto } from './dto';
import { PaginatedResult } from '@app/dto';

@Injectable()
export class HopDongService {
  constructor(
    @InjectRepository(HopDong)
    private readonly hopDongRepository: Repository<HopDong>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: HopDongQueryDto,
  ): Promise<PaginatedResult<HopDong>> {
    const { page = 1, limit = 10, search, trangThai, doiTuongId } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.hopDongRepository.find({ where: this.getTenantFilter() as any });
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    // Filter by trangThai
    if (trangThai) {
      filteredItems = filteredItems.filter(
        (item) => item.trangThai === trangThai,
      );
    }

    // Filter by doiTuongId
    if (doiTuongId) {
      filteredItems = filteredItems.filter(
        (item) => item.doiTuongId === doiTuongId,
      );
    }

    // Filter by search keyword
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.soHopDong?.toLowerCase().includes(searchLower) ||
          item.tenCongTrinh?.toLowerCase().includes(searchLower),
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

  async findAll(): Promise<HopDong[]> {
    const allItems = await this.hopDongRepository.find({ where: this.getTenantFilter() as any });
    return allItems.filter((item) => item.isActive !== false);
  }

  async findOne(id: string): Promise<HopDong> {
    const { ObjectId } = await import('mongodb');
    const hopDong = await this.hopDongRepository.findOne({
      where: { _id: new ObjectId(id) as never },
    });

    if (!hopDong) {
      throw new NotFoundException(`Không tìm thấy HopDong với ID ${id}`);
    }

    return hopDong;
  }

  async findBySoHopDong(soHopDong: string): Promise<HopDong | null> {
    return this.hopDongRepository.findOne({ where: { soHopDong, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateHopDongDto): Promise<HopDong> {
    const existing = await this.findBySoHopDong(createDto.soHopDong);
    if (existing) {
      throw new ConflictException(
        `Số hợp đồng ${createDto.soHopDong} đã tồn tại`,
      );
    }

    const hopDong = this.hopDongRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.hopDongRepository.save(hopDong);
  }

  async update(id: string, updateDto: UpdateHopDongDto): Promise<HopDong> {
    const hopDong = await this.findOne(id);

    if (updateDto.soHopDong && updateDto.soHopDong !== hopDong.soHopDong) {
      const existing = await this.findBySoHopDong(updateDto.soHopDong);
      if (existing) {
        throw new ConflictException(
          `Số hợp đồng ${updateDto.soHopDong} đã tồn tại`,
        );
      }
    }

    Object.assign(hopDong, sanitizeUpdateDto(updateDto));
    return this.hopDongRepository.save(hopDong);
  }

  async delete(id: string): Promise<void> {
    const hopDong = await this.findOne(id);
    hopDong.isActive = false;
    await this.hopDongRepository.save(hopDong);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.hopDongRepository as unknown as MongoRepository<HopDong>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<HopDong[]> {
    const allItems = await this.findAll();

    if (!keyword) {
      return allItems.slice(0, limit);
    }

    const searchLower = keyword.toLowerCase();
    return allItems
      .filter(
        (item) =>
          item.soHopDong?.toLowerCase().includes(searchLower) ||
          item.tenCongTrinh?.toLowerCase().includes(searchLower),
      )
      .slice(0, limit);
  }

  async checkSoHopDongExists(
    soHopDong: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.findBySoHopDong(soHopDong);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{
    total: number;
    byTrangThai: Record<TrangThaiHopDong, number>;
  }> {
    const allItems = await this.findAll();

    const byTrangThai = {
      [TrangThaiHopDong.CHUA_CO_HD]: 0,
      [TrangThaiHopDong.HD_CHUA_KY]: 0,
      [TrangThaiHopDong.HD_PHOTO_SCAN]: 0,
      [TrangThaiHopDong.HD_GOC]: 0,
    };

    allItems.forEach((item) => {
      if (item.trangThai && byTrangThai[item.trangThai] !== undefined) {
        byTrangThai[item.trangThai]++;
      }
    });

    return {
      total: allItems.length,
      byTrangThai,
    };
  }
}
