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
import { LyDoKhongHopLe } from '@app/entities';
import { CreateLyDoKhongHopLeDto, UpdateLyDoKhongHopLeDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class LyDoKhongHopLeService {
  constructor(
    @InjectRepository(LyDoKhongHopLe)
    private readonly lyDoKhongHopLeRepository: Repository<LyDoKhongHopLe>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.lyDoKhongHopLeRepository.count({
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
    return this.lyDoKhongHopLeRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<LyDoKhongHopLe>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.lyDoKhongHopLeRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<LyDoKhongHopLe[]> {
    return this.lyDoKhongHopLeRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<LyDoKhongHopLe> {
    const { ObjectId } = await import('mongodb');
    const lyDoKhongHopLe = await this.lyDoKhongHopLeRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!lyDoKhongHopLe) {
      throw new NotFoundException(`Không tìm thấy LyDoKhongHopLe với ID ${id}`);
    }

    return lyDoKhongHopLe;
  }

  async findByMa(ma: string): Promise<LyDoKhongHopLe | null> {
    return this.lyDoKhongHopLeRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateLyDoKhongHopLeDto): Promise<LyDoKhongHopLe> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã lý do không hợp lệ ${createDto.ma} đã tồn tại`);
    }

    const lyDoKhongHopLe = this.lyDoKhongHopLeRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.lyDoKhongHopLeRepository.save(lyDoKhongHopLe);
  }

  async update(id: string, updateDto: UpdateLyDoKhongHopLeDto): Promise<LyDoKhongHopLe> {
    const lyDoKhongHopLe = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== lyDoKhongHopLe.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã lý do không hợp lệ ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(lyDoKhongHopLe, sanitizeUpdateDto(updateDto));
    return this.lyDoKhongHopLeRepository.save(lyDoKhongHopLe);
  }

  async delete(id: string): Promise<void> {
    const lyDoKhongHopLe = await this.findOne(id);
    lyDoKhongHopLe.isActive = false;
    await this.lyDoKhongHopLeRepository.save(lyDoKhongHopLe);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.lyDoKhongHopLeRepository as unknown as MongoRepository<LyDoKhongHopLe>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<LyDoKhongHopLe[]> {
    if (!keyword) {
      return this.lyDoKhongHopLeRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.lyDoKhongHopLeRepository.find({
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
    const allItems = await this.lyDoKhongHopLeRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);
    return { tong: activeItems.length };
  }
}
