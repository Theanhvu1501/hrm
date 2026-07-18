import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { PaginatedResult, PaginationQueryDto } from '@app/dto';
import { NhomKhoanMuc, NhomKhoanMucLoai } from '@app/entities';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { CreateNhomKhoanMucDto, UpdateNhomKhoanMucDto } from './dto';

@Injectable()
export class NhomKhoanMucService {
  constructor(
    @InjectRepository(NhomKhoanMuc)
    private readonly nhomKhoanMucRepository: Repository<NhomKhoanMuc>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: PaginationQueryDto & { loai?: string },
  ): Promise<PaginatedResult<NhomKhoanMuc>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { search, loai } = query;
    const skip = (page - 1) * limit;

    const baseWhere: any = { isActive: true, ...this.getTenantFilter() };
    if (loai) {
      baseWhere.loai = loai;
    }

    let data: NhomKhoanMuc[];
    let total: number;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchWhere = {
        ...baseWhere,
        $or: [
          { ma: { $regex: searchRegex } },
          { ten: { $regex: searchRegex } },
        ],
      };
      [data, total] = await this.nhomKhoanMucRepository.findAndCount({
        where: searchWhere,
        skip,
        take: limit,
      });
    } else {
      [data, total] = await this.nhomKhoanMucRepository.findAndCount({
        where: baseWhere,
        skip,
        take: limit,
      });
    }

    data.sort((a, b) => a.ma.localeCompare(b.ma));

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

  async findAll(loai?: NhomKhoanMucLoai): Promise<NhomKhoanMuc[]> {
    const where: any = { isActive: true, ...this.getTenantFilter() };
    if (loai) {
      where.loai = loai;
    }
    const data = await this.nhomKhoanMucRepository.find({ where });
    return data.sort((a, b) => a.ma.localeCompare(b.ma));
  }

  async findOne(id: string): Promise<NhomKhoanMuc> {
    const { ObjectId } = await import('mongodb');
    const nhomKhoanMuc = await this.nhomKhoanMucRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!nhomKhoanMuc) {
      throw new NotFoundException(`Không tìm thấy NhomKhoanMuc với ID ${id}`);
    }
    return nhomKhoanMuc;
  }

  async findByMa(ma: string): Promise<NhomKhoanMuc | null> {
    return this.nhomKhoanMucRepository.findOne({
      where: { ma, isActive: true, ...this.getTenantFilter() },
    });
  }

  async create(createDto: CreateNhomKhoanMucDto): Promise<NhomKhoanMuc> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
    }
    const nhomKhoanMuc = this.nhomKhoanMucRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nhomKhoanMucRepository.save(nhomKhoanMuc);
  }

  async update(
    id: string,
    updateDto: UpdateNhomKhoanMucDto,
  ): Promise<NhomKhoanMuc> {
    const nhomKhoanMuc = await this.findOne(id);
    if (updateDto.ma && updateDto.ma !== nhomKhoanMuc.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ${updateDto.ma} đã tồn tại`);
      }
    }
    Object.assign(nhomKhoanMuc, sanitizeUpdateDto(updateDto));
    return this.nhomKhoanMucRepository.save(nhomKhoanMuc);
  }

  async delete(id: string): Promise<void> {
    const nhomKhoanMuc = await this.findOne(id);
    nhomKhoanMuc.isActive = false;
    await this.nhomKhoanMucRepository.save(nhomKhoanMuc);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.nhomKhoanMucRepository as unknown as MongoRepository<NhomKhoanMuc>,
      ids,
    );
  }

  async getStats(): Promise<{
    tongNhomKhoanMuc: number;
    chiPhi: number;
    doanhThu: number;
  }> {
    const all = await this.nhomKhoanMucRepository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
    return {
      tongNhomKhoanMuc: all.length,
      chiPhi: all.filter((n) => n.loai === NhomKhoanMucLoai.CHI_PHI).length,
      doanhThu: all.filter((n) => n.loai === NhomKhoanMucLoai.DOANH_THU).length,
    };
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing.id === excludeId) return false;
    return true;
  }
}
