import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { ThuTienHopDong } from '@app/entities';
import { CreateThuTienHopDongDto, UpdateThuTienHopDongDto } from './dto';

@Injectable()
export class ThuTienHopDongService {
  constructor(
    @InjectRepository(ThuTienHopDong)
    private readonly repo: Repository<ThuTienHopDong>,
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
  }): Promise<ThuTienHopDong[]> {
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    let items = all.filter((i) => i.isActive !== false);
    if (query.hopDongId) items = items.filter((i) => i.hopDongId === query.hopDongId);
    if (query.nam) items = items.filter((i) => i.nam === Number(query.nam));
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (i) =>
          (i.soHopDong || '').toLowerCase().includes(s) ||
          (i.tenKhachHang || '').toLowerCase().includes(s) ||
          (i.noiDung || '').toLowerCase().includes(s),
      );
    }
    return items;
  }

  async create(dto: CreateThuTienHopDongDto): Promise<ThuTienHopDong> {
    const entity = this.repo.create({ ...dto, isActive: true } as Partial<ThuTienHopDong>);
    return this.repo.save(entity as ThuTienHopDong);
  }

  async update(id: string, dto: UpdateThuTienHopDongDto): Promise<ThuTienHopDong> {
    const { ObjectId } = await import('mongodb');
    const entity = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!entity) throw new NotFoundException(`Không tìm thấy phiếu thu ${id}`);
    Object.assign(entity, sanitizeUpdateDto(dto));
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    const { ObjectId } = await import('mongodb');
    const entity = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!entity) throw new NotFoundException(`Không tìm thấy phiếu thu ${id}`);
    entity.isActive = false;
    await this.repo.save(entity);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repo as unknown as MongoRepository<ThuTienHopDong>,
      ids,
    );
  }
}
