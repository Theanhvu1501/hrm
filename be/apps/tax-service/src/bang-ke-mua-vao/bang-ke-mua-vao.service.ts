import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { BangKeMuaVao } from '@app/entities';
import { PaginatedResult } from '@app/dto';
import {
  CreateBangKeMuaVaoDto,
  UpdateBangKeMuaVaoDto,
  BangKeMuaVaoQueryDto,
  DuplicateKeyDto,
} from './dto';
import {
  tinhTienThue,
  resolveDateRange,
  inDateRange,
  buildHoaDonKey,
} from '../shared/tax-helpers';

@Injectable()
export class BangKeMuaVaoService {
  constructor(
    @InjectRepository(BangKeMuaVao)
    private readonly repo: Repository<BangKeMuaVao>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  /**
   * Chốt tiền thuế + tổng thanh toán.
   *
   * Mặc định tính theo công thức, NHƯNG tôn trọng số người dùng gửi lên: hóa đơn nhà cung cấp
   * tính thuế trên từng dòng hàng rồi cộng nên hay lệch vài đồng so với tính trên tổng.
   * Quy tắc liên động do FE giữ — đổi giá trị / thuế suất thì FE gửi lên tiền thuế đã tính lại,
   * nên ở đây KHÔNG lấy `target.tienThue` làm fallback (số tay cũ sẽ dính lại).
   */
  private applyTotals<
    T extends {
      giaTriChuaThue?: number;
      thueSuat?: string;
      tienThue?: number;
      tongThanhToan?: number;
    },
  >(target: BangKeMuaVao, dto: T): void {
    const gia = dto.giaTriChuaThue ?? target.giaTriChuaThue ?? 0;
    const suat = dto.thueSuat ?? target.thueSuat ?? '10';
    const tienThue = dto.tienThue ?? tinhTienThue(gia, suat);
    target.giaTriChuaThue = gia;
    target.thueSuat = suat;
    target.tienThue = tienThue;
    target.tongThanhToan = dto.tongThanhToan ?? Number(gia) + tienThue;
  }

  async findAllPaginated(
    query: BangKeMuaVaoQueryDto,
  ): Promise<PaginatedResult<BangKeMuaVao>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.repo.find({
      where: this.getTenantFilter() as any,
    });
    let items = allItems.filter((i) => i.isActive !== false);

    const range = resolveDateRange(query);
    if (range.start || range.end) {
      items = items.filter((i) => inDateRange(i.ngayHoaDon, range));
    }

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.soHoaDon?.toLowerCase().includes(s) ||
          i.tenNguoiBan?.toLowerCase().includes(s) ||
          i.mstNguoiBan?.toLowerCase().includes(s),
      );
    }

    items.sort(
      (a, b) =>
        new Date(b.ngayHoaDon).getTime() - new Date(a.ngayHoaDon).getTime(),
    );

    const total = items.length;
    const data = items.slice(skip, skip + limit);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<BangKeMuaVao> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy hóa đơn mua vào ID ${id}`);
    }
    return item;
  }

  async create(createDto: CreateBangKeMuaVaoDto): Promise<BangKeMuaVao> {
    const entity = this.repo.create({
      ...createDto,
      ngayHoaDon: new Date(createDto.ngayHoaDon),
      isActive: true,
    });
    this.applyTotals(entity, createDto);
    return this.repo.save(entity);
  }

  /** Tạo hàng loạt hóa đơn từ file Excel. tenantId do TenantSubscriber gắn khi insert. */
  async importMany(
    items: CreateBangKeMuaVaoDto[],
  ): Promise<{ created: number }> {
    const entities = items.map((dto) => {
      const entity = this.repo.create({
        ...dto,
        ngayHoaDon: new Date(dto.ngayHoaDon),
        isActive: true,
      });
      this.applyTotals(entity, dto);
      return entity;
    });
    const saved = await this.repo.save(entities);
    return { created: saved.length };
  }

  /** Trả về những khóa hóa đơn đã tồn tại trong tenant (xem `buildHoaDonKey`). */
  async checkDuplicates(keys: DuplicateKeyDto[]): Promise<string[]> {
    if (!keys?.length) return [];

    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    const existing = new Set(
      all
        .filter((i) => i.isActive !== false)
        .map((i) => buildHoaDonKey(i.soHoaDon, i.kyHieuHoaDon, i.mstNguoiBan)),
    );

    const found = new Set<string>();
    for (const k of keys) {
      const key = buildHoaDonKey(k.soHoaDon, k.kyHieuHoaDon, k.mst);
      if (existing.has(key)) found.add(key);
    }
    return [...found];
  }

  async update(
    id: string,
    updateDto: UpdateBangKeMuaVaoDto,
  ): Promise<BangKeMuaVao> {
    const item = await this.findOne(id);
    const clean = sanitizeUpdateDto(updateDto);
    Object.assign(item, clean);
    if (updateDto.ngayHoaDon) item.ngayHoaDon = new Date(updateDto.ngayHoaDon);
    this.applyTotals(item, updateDto);
    return this.repo.save(item);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repo as unknown as MongoRepository<BangKeMuaVao>,
      ids,
    );
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
