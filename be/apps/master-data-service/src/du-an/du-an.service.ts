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
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { DuAn, DuAnStatus } from '@app/entities';
import { CreateDuAnDto, UpdateDuAnDto } from './dto';
import type { CreateDuAnDto as CreateDuAnDtoType } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';
import { ChuDauTuService } from '../chu-dau-tu/chu-dau-tu.service';

@Injectable()
export class DuAnService {
  constructor(
    @InjectRepository(DuAn)
    private readonly duAnRepository: Repository<DuAn>,
    @Inject(forwardRef(() => ChuDauTuService))
    private readonly chuDauTuService: ChuDauTuService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  /**
   * Build query conditions for filtering
   */
  private buildWhereConditions(search?: string, trangThai?: DuAnStatus): any {
    const where: any = { isActive: true, ...this.getTenantFilter() };
    if (trangThai) {
      where.trangThai = trangThai;
    }
    // Note: For MongoDB with TypeORM, regex search needs special handling
    // This will be applied in the query builder or post-filter for complex searches
    return where;
  }

  /**
   * Get total count using DB query (separate from data query)
   */
  async getTotal(search?: string, trangThai?: DuAnStatus): Promise<number> {
    const where = this.buildWhereConditions(undefined, trangThai);

    if (search) {
      // For MongoDB, use regex matching at DB level
      const searchRegex = new RegExp(search, 'i');
      const count = await this.duAnRepository.count({
        where: {
          ...where,
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
            { chuDuAn: { $regex: searchRegex } },
          ],
        },
      });
      return count;
    }

    return this.duAnRepository.count({ where });
  }

  async findAllPaginated(
    query: PaginationQueryDto & { trangThai?: DuAnStatus },
  ): Promise<PaginatedResult<DuAn>> {
    const { page = 1, limit = 10, search, trangThai } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate (MongoDB count workaround)
    const allItems = await this.duAnRepository.find({ where: this.getTenantFilter() as any });
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (trangThai) {
      filteredItems = filteredItems.filter(
        (item) => item.trangThai === trangThai,
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.ma.toLowerCase().includes(searchLower) ||
          item.ten.toLowerCase().includes(searchLower) ||
          (item.chuDuAn && item.chuDuAn.toLowerCase().includes(searchLower)),
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
   * Find all with optional filter - use sparingly, prefer paginated
   */
  async findAll(trangThai?: DuAnStatus): Promise<DuAn[]> {
    const where: any = { isActive: true, ...this.getTenantFilter() };
    if (trangThai) {
      where.trangThai = trangThai;
    }
    return this.duAnRepository.find({ where });
  }

  async findOne(id: string): Promise<DuAn> {
    const { ObjectId } = await import('mongodb');
    const duAn = await this.duAnRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!duAn) {
      throw new NotFoundException(`Không tìm thấy DuAn với ID ${id}`);
    }

    return duAn;
  }

  async findByMa(ma: string): Promise<DuAn | null> {
    return this.duAnRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateDuAnDto): Promise<DuAn> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(
        `Mã dự án ${createDto.ma} đã tồn tại`,
      );
    }

    // Populate ChuDauTu info if chuDauTuId is provided
    let chuDuAnMa = createDto.chuDuAnMa;
    let chuDuAn = createDto.chuDuAn;

    if (createDto.chuDauTuId) {
      try {
        const chuDauTu = await this.chuDauTuService.findOne(
          createDto.chuDauTuId,
        );
        chuDuAnMa = chuDauTu.ma;
        chuDuAn = chuDauTu.ten;
      } catch {
        // ChuDauTu not found, keep original values
      }
    }

    const duAn = this.duAnRepository.create({
      ...createDto,
      chuDuAnMa,
      chuDuAn,
      trangThai: createDto.trangThai || DuAnStatus.DANG_THUC_HIEN,
      isActive: true,
    });
    return this.duAnRepository.save(duAn);
  }

  async update(id: string, updateDto: UpdateDuAnDto): Promise<DuAn> {
    const duAn = await this.findOne(id);

    const dto = updateDto as Partial<CreateDuAnDtoType>;
    if (dto.ma && dto.ma !== duAn.ma) {
      const existing = await this.findByMa(dto.ma);
      if (existing) {
        throw new ConflictException(`Mã dự án ${dto.ma} đã tồn tại`);
      }
    }

    // Populate ChuDauTu info if chuDauTuId is updated
    if (dto.chuDauTuId && dto.chuDauTuId !== duAn.chuDauTuId) {
      try {
        const chuDauTu = await this.chuDauTuService.findOne(dto.chuDauTuId);
        dto.chuDuAnMa = chuDauTu.ma;
        dto.chuDuAn = chuDauTu.ten;
      } catch {
        // ChuDauTu not found, keep original values
      }
    }

    Object.assign(duAn, sanitizeUpdateDto(updateDto));
    return this.duAnRepository.save(duAn);
  }

  async delete(id: string): Promise<void> {
    const duAn = await this.findOne(id);
    duAn.isActive = false;
    await this.duAnRepository.save(duAn);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.duAnRepository as unknown as MongoRepository<DuAn>,
      ids,
    );
  }

  async updateStatus(id: string, trangThai: DuAnStatus): Promise<DuAn> {
    const duAn = await this.findOne(id);
    duAn.trangThai = trangThai;
    return this.duAnRepository.save(duAn);
  }

  /**
   * Search projects by keyword in ma, ten, or chuDuAn fields using DB query
   */
  async search(keyword: string, limit = 20): Promise<DuAn[]> {
    if (!keyword) {
      return this.duAnRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.duAnRepository.find({
      where: {
        isActive: true,
        ...this.getTenantFilter(),
        $or: [
          { ma: { $regex: searchRegex } },
          { ten: { $regex: searchRegex } },
          { chuDuAn: { $regex: searchRegex } },
        ],
      } as any,
      take: limit,
    });
  }

  /**
   * Check if project code already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  /**
   * Get project statistics using filter (MongoDB count workaround)
   */
  async getStats(): Promise<{
    tongDuAn: number;
    dangThucHien: number;
    hoanThanh: number;
    tamDung: number;
  }> {
    const allItems = await this.duAnRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const tongDuAn = activeItems.length;
    const dangThucHien = activeItems.filter(
      (item) => item.trangThai === DuAnStatus.DANG_THUC_HIEN,
    ).length;
    const hoanThanh = activeItems.filter(
      (item) => item.trangThai === DuAnStatus.HOAN_THANH,
    ).length;
    const tamDung = activeItems.filter(
      (item) => item.trangThai === DuAnStatus.TAM_DUNG,
    ).length;

    return {
      tongDuAn,
      dangThucHien,
      hoanThanh,
      tamDung,
    };
  }
}
