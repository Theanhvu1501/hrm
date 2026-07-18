import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { HoaDonBanRa } from '@app/entities';
import { CreateHoaDonBanRaDto, UpdateHoaDonBanRaDto } from './dto';

@Injectable()
export class HoaDonBanRaService {
  constructor(
    @InjectRepository(HoaDonBanRa)
    private readonly repo: Repository<HoaDonBanRa>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async list(query: {
    hopDongId?: string;
    nam?: number;
    search?: string;
  }): Promise<HoaDonBanRa[]> {
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    let items = all.filter((i) => i.isActive !== false);
    if (query.hopDongId) items = items.filter((i) => i.hopDongId === query.hopDongId);
    if (query.nam) items = items.filter((i) => i.nam === Number(query.nam));
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (i) =>
          (i.soHoaDon || '').toLowerCase().includes(s) ||
          (i.soHopDong || '').toLowerCase().includes(s) ||
          (i.donViMua || '').toLowerCase().includes(s) ||
          (i.tenCongTrinh || '').toLowerCase().includes(s),
      );
    }
    return items;
  }

  async create(dto: CreateHoaDonBanRaDto): Promise<HoaDonBanRa> {
    const entity = this.repo.create({ ...dto, isActive: true } as Partial<HoaDonBanRa>);
    return this.repo.save(entity as HoaDonBanRa);
  }

  async update(id: string, dto: UpdateHoaDonBanRaDto): Promise<HoaDonBanRa> {
    const { ObjectId } = await import('mongodb');
    const entity = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!entity) throw new NotFoundException(`Không tìm thấy hóa đơn ${id}`);
    Object.assign(entity, sanitizeUpdateDto(dto));
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    const { ObjectId } = await import('mongodb');
    const entity = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!entity) throw new NotFoundException(`Không tìm thấy hóa đơn ${id}`);
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repo as unknown as MongoRepository<HoaDonBanRa>,
      ids,
    );
  }
}
