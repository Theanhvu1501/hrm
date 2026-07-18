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
import { Kho } from '@app/entities';
import { CreateKhoDto, UpdateKhoDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class KhoService {
  constructor(
    @InjectRepository(Kho)
    private readonly khoRepository: Repository<Kho>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.khoRepository.count({
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
    return this.khoRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<Kho>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.khoRepository.find({ where: this.getTenantFilter() as any });
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

  async findAll(): Promise<Kho[]> {
    return this.khoRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<Kho> {
    const { ObjectId } = await import('mongodb');
    const kho = await this.khoRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!kho) {
      throw new NotFoundException(`Không tìm thấy Kho với ID ${id}`);
    }

    return kho;
  }

  async findByMa(ma: string): Promise<Kho | null> {
    return this.khoRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateKhoDto): Promise<Kho> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã kho ${createDto.ma} đã tồn tại`);
    }

    const kho = this.khoRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.khoRepository.save(kho);
  }

  async update(id: string, updateDto: UpdateKhoDto): Promise<Kho> {
    const kho = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== kho.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã kho ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(kho, sanitizeUpdateDto(updateDto));
    return this.khoRepository.save(kho);
  }

  async delete(id: string): Promise<void> {
    const kho = await this.findOne(id);
    kho.isActive = false;
    await this.khoRepository.save(kho);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.khoRepository as unknown as MongoRepository<Kho>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<Kho[]> {
    if (!keyword) {
      return this.khoRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.khoRepository.find({
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
    const allItems = await this.khoRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);
    return { tong: activeItems.length };
  }
}
