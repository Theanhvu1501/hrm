import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SoDuDauKy } from '@app/entities';
import { TenantContextService } from '@app/core';
import { SaveSoDuDauKyDto } from './dto';

export interface SoDuDauKyResult {
  ngayApDung: Date | null;
  items: Array<{
    maTaiKhoan: string;
    duNo: number;
    duCo: number;
    chiTietType?: string;
    chiTietId?: string;
    chiTietMa?: string;
    chiTietTen?: string;
    nganHang?: string;
  }>;
  tongNo: number;
  tongCo: number;
  canDoi: boolean;
}

@Injectable()
export class SoDuDauKyService {
  constructor(
    @InjectRepository(SoDuDauKy)
    private readonly repo: Repository<SoDuDauKy>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getAll(): Promise<SoDuDauKyResult> {
    const records = await this.repo.find({
      where: this.getTenantFilter() as any,
    });

    const items = records.map((r) => ({
      maTaiKhoan: r.maTaiKhoan,
      duNo: Number(r.duNo) || 0,
      duCo: Number(r.duCo) || 0,
      chiTietType: r.chiTietType,
      chiTietId: r.chiTietId,
      chiTietMa: r.chiTietMa,
      chiTietTen: r.chiTietTen,
      nganHang: r.nganHang,
    }));

    const tongNo = items.reduce((s, i) => s + i.duNo, 0);
    const tongCo = items.reduce((s, i) => s + i.duCo, 0);
    const ngayApDung = records.length > 0 ? records[0].ngayApDung : null;

    const canDoi = Math.round(tongNo * 100) === Math.round(tongCo * 100);

    return { ngayApDung, items, tongNo, tongCo, canDoi };
  }

  async saveBulk(dto: SaveSoDuDauKyDto): Promise<SoDuDauKyResult> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const tenantFilter = this.getTenantFilter();

    const ngayApDung = new Date(dto.ngayApDung);

    // Giữ dòng có số dư khác 0 HOẶC có đối tượng (chiTietId) HOẶC có ngân hàng gõ tay
    const toSave = dto.items
      .filter(
        (i) =>
          (Number(i.duNo) || 0) !== 0 ||
          (Number(i.duCo) || 0) !== 0 ||
          !!i.chiTietId ||
          !!i.nganHang,
      )
      .map((i) =>
        this.repo.create({
          maTaiKhoan: i.maTaiKhoan,
          duNo: Number(i.duNo) || 0,
          duCo: Number(i.duCo) || 0,
          chiTietType: i.chiTietType,
          chiTietId: i.chiTietId,
          chiTietMa: i.chiTietMa,
          chiTietTen: i.chiTietTen,
          nganHang: i.nganHang,
          ngayApDung,
          ...(tenantId ? { tenantId } : {}),
        }),
      );

    // Xoá toàn bộ bản ghi cũ của tenant
    const existing = await this.repo.find({ where: tenantFilter as any });
    if (existing.length > 0) {
      await this.repo.remove(existing);
    }

    if (toSave.length > 0) {
      await this.repo.save(toSave);
    }

    return this.getAll();
  }
}
