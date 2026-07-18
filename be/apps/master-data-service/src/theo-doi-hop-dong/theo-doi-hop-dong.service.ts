import { sanitizeUpdateDto, TenantContextService } from '@app/core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HopDong,
  TheoDoiHopDong,
  ThuTienHopDong,
  HoaDonBanRa,
} from '@app/entities';
import { UpsertTheoDoiHopDongDto } from './dto';

export interface TheoDoiHopDongRow {
  hopDongId: string;
  soHopDong: string;
  tenCongTrinh: string;
  nam?: number;
  giaTriSauThue?: number;
  ngayKy?: Date;
  doiTuongId?: string;
  trangThaiHopDong?: string;
  tracking: TheoDoiHopDong | null;
  daThanhToan: number;
  daTraHoaDon: number;
  conLai: number;
}

export interface BaoCaoHopDongRow {
  nam: number | null;
  soLuong: number;
  giaTri: number;
  quyetToan: number;
  thuTien: number;
  chuaCoHD: number;
  hdChuaKy: number;
  hdPhotoScan: number;
  hdGoc: number;
  giaTriBinhQuan: number;
}

const num = (v: unknown): number => Number(v) || 0;

const emptyBaoCaoRow = (nam: number | null): BaoCaoHopDongRow => ({
  nam,
  soLuong: 0,
  giaTri: 0,
  quyetToan: 0,
  thuTien: 0,
  chuaCoHD: 0,
  hdChuaKy: 0,
  hdPhotoScan: 0,
  hdGoc: 0,
  giaTriBinhQuan: 0,
});

@Injectable()
export class TheoDoiHopDongService {
  constructor(
    @InjectRepository(TheoDoiHopDong)
    private readonly repo: Repository<TheoDoiHopDong>,
    @InjectRepository(HopDong)
    private readonly hopDongRepo: Repository<HopDong>,
    @InjectRepository(ThuTienHopDong)
    private readonly thuTienRepo: Repository<ThuTienHopDong>,
    @InjectRepository(HoaDonBanRa)
    private readonly hoaDonRepo: Repository<HoaDonBanRa>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  /** Tổng thu tiền / hóa đơn theo từng hopDongId (đúng Excel: tự cộng từ 2 sổ). */
  private async buildSumMaps(): Promise<{
    thuByHd: Map<string, number>;
    hoaDonByHd: Map<string, number>;
  }> {
    const tenant = this.getTenantFilter();
    const [thus, hoaDons] = await Promise.all([
      this.thuTienRepo.find({ where: tenant as any }),
      this.hoaDonRepo.find({ where: tenant as any }),
    ]);
    const thuByHd = new Map<string, number>();
    for (const t of thus) {
      if (t.isActive === false) continue;
      thuByHd.set(t.hopDongId, (thuByHd.get(t.hopDongId) || 0) + num(t.soTien));
    }
    const hoaDonByHd = new Map<string, number>();
    for (const h of hoaDons) {
      if (h.isActive === false) continue;
      hoaDonByHd.set(h.hopDongId, (hoaDonByHd.get(h.hopDongId) || 0) + num(h.tong));
    }
    return { thuByHd, hoaDonByHd };
  }

  private toRow(
    hd: HopDong,
    t: TheoDoiHopDong | null,
    daThanhToan: number,
    daTraHoaDon: number,
  ): TheoDoiHopDongRow {
    const base = num(t?.quyetToan?.giaTri) || num(hd.giaTriSauThue);
    const conLai = base - daThanhToan;
    return {
      hopDongId: hd._id.toString(),
      soHopDong: hd.soHopDong,
      tenCongTrinh: hd.tenCongTrinh,
      nam: hd.nam,
      giaTriSauThue: hd.giaTriSauThue,
      ngayKy: hd.ngayKy,
      doiTuongId: hd.doiTuongId,
      trangThaiHopDong: hd.trangThai,
      tracking: t,
      daThanhToan,
      daTraHoaDon,
      conLai,
    };
  }

  async list(query: { nam?: number; search?: string }): Promise<TheoDoiHopDongRow[]> {
    const tenant = this.getTenantFilter();
    const hopDongs = await this.hopDongRepo.find({
      where: { isActive: true, ...tenant } as any,
    });
    const trackings = await this.repo.find({ where: { ...tenant } as any });
    const byHd = new Map(trackings.map((t) => [t.hopDongId, t]));
    const { thuByHd, hoaDonByHd } = await this.buildSumMaps();

    let rows = hopDongs.map((hd) => {
      const id = hd._id.toString();
      return this.toRow(
        hd,
        byHd.get(id) ?? null,
        thuByHd.get(id) || 0,
        hoaDonByHd.get(id) || 0,
      );
    });

    if (query.nam) {
      const n = Number(query.nam);
      rows = rows.filter((r) => r.nam === n);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.soHopDong || '').toLowerCase().includes(s) ||
          (r.tenCongTrinh || '').toLowerCase().includes(s),
      );
    }
    return rows;
  }

  async getByHopDongId(hopDongId: string): Promise<TheoDoiHopDong | null> {
    return this.repo.findOne({
      where: { hopDongId, ...this.getTenantFilter() } as any,
    });
  }

  async upsert(
    hopDongId: string,
    dto: UpsertTheoDoiHopDongDto,
  ): Promise<TheoDoiHopDong> {
    let tracking = await this.getByHopDongId(hopDongId);
    if (!tracking) {
      // tenantId được TenantProxy tự gắn khi save
      tracking = this.repo.create({
        hopDongId,
        isActive: true,
      } as Partial<TheoDoiHopDong>) as TheoDoiHopDong;
    }
    Object.assign(tracking, sanitizeUpdateDto(dto));
    tracking.hopDongId = hopDongId;
    return this.repo.save(tracking);
  }

  /** Báo cáo nhanh theo năm (sheet "TỔNG HỢP"). */
  async baoCao(): Promise<{ rows: BaoCaoHopDongRow[]; tong: BaoCaoHopDongRow }> {
    const tenant = this.getTenantFilter();
    const hopDongs = await this.hopDongRepo.find({
      where: { isActive: true, ...tenant } as any,
    });
    const trackings = await this.repo.find({ where: { ...tenant } as any });
    const byHd = new Map(trackings.map((t) => [t.hopDongId, t]));
    const { thuByHd } = await this.buildSumMaps();

    const map = new Map<string, BaoCaoHopDongRow>();
    for (const hd of hopDongs) {
      const id = hd._id.toString();
      const t = byHd.get(id);
      const giaTri =
        num(hd.giaTriSauThue) + num(hd.phuLuc1?.giaTri) + num(hd.phuLuc2?.giaTri);
      const quyetToan = num(t?.quyetToan?.giaTri);
      const thuTien = thuByHd.get(id) || 0;

      const key = hd.nam != null ? String(hd.nam) : 'null';
      const row = map.get(key) ?? emptyBaoCaoRow(hd.nam ?? null);
      row.soLuong += 1;
      row.giaTri += giaTri;
      row.quyetToan += quyetToan;
      row.thuTien += thuTien;
      if (hd.trangThai === 'CHUA_CO_HD') row.chuaCoHD += 1;
      else if (hd.trangThai === 'HD_CHUA_KY') row.hdChuaKy += 1;
      else if (hd.trangThai === 'HD_PHOTO_SCAN') row.hdPhotoScan += 1;
      else if (hd.trangThai === 'HD_GOC') row.hdGoc += 1;
      map.set(key, row);
    }

    const rows = [...map.values()].sort((a, b) => (a.nam ?? 999999) - (b.nam ?? 999999));
    rows.forEach((r) => {
      r.giaTriBinhQuan = r.soLuong ? r.giaTri / r.soLuong : 0;
    });

    const tong = rows.reduce((acc, r) => {
      acc.soLuong += r.soLuong;
      acc.giaTri += r.giaTri;
      acc.quyetToan += r.quyetToan;
      acc.thuTien += r.thuTien;
      acc.chuaCoHD += r.chuaCoHD;
      acc.hdChuaKy += r.hdChuaKy;
      acc.hdPhotoScan += r.hdPhotoScan;
      acc.hdGoc += r.hdGoc;
      return acc;
    }, emptyBaoCaoRow(null));
    tong.giaTriBinhQuan = tong.soLuong ? tong.giaTri / tong.soLuong : 0;

    return { rows, tong };
  }

  async getStats(): Promise<{
    tongGiaTri: number;
    tongDaThanhToan: number;
    tongConLai: number;
  }> {
    const rows = await this.list({});
    return {
      tongGiaTri: rows.reduce((s, r) => s + num(r.giaTriSauThue), 0),
      tongDaThanhToan: rows.reduce((s, r) => s + r.daThanhToan, 0),
      tongConLai: rows.reduce((s, r) => s + r.conLai, 0),
    };
  }
}
