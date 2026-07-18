import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiemDanhAn, DinhMucTienAn, CongThucDinhLuong } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { tinhTieuHao, tinhNganSach, tinhDonGiaBinhQuan, tinhChiPhiThuc, tinhHaoPhi } from '../engine/bep-an-engine';
import { buildButToanGiaVon, buildPhieuXuatKho } from './ghi-so-tieu-hao.builder';

@Injectable()
export class KiemSoatService {
  constructor(
    @InjectRepository(DiemDanhAn) private readonly diemDanhRepo: Repository<DiemDanhAn>,
    @InjectRepository(DinhMucTienAn) private readonly dinhMucRepo: Repository<DinhMucTienAn>,
    @InjectRepository(CongThucDinhLuong) private readonly congThucRepo: Repository<CongThucDinhLuong>,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tf() { const t = this.tenantContext.getCurrentTenantId(); return t ? { tenantId: t } : {}; }

  async chiPhi(tuNgay?: string, denNgay?: string, nguongPct?: number, authToken?: string) {
    // 1) Điểm danh trong kỳ (lọc theo ngày ở JS cho đơn giản)
    const allDiemDanh = await this.diemDanhRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const from = tuNgay ? new Date(tuNgay) : null;
    let toExclusive: Date | null = null;
    if (denNgay) {
      toExclusive = new Date(denNgay);
      toExclusive.setDate(toExclusive.getDate() + 1);
    }
    const rows = allDiemDanh.filter((d) => {
      const n = new Date(d.ngay).getTime();
      return (!from || n >= from.getTime()) && (!toExclusive || n < toExclusive.getTime());
    });

    // 2) Định mức + công thức
    const dinhMucList = await this.dinhMucRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const congThucList = await this.congThucRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const congThucByCode: Record<string, any> = {};
    for (const c of congThucList) congThucByCode[c.code] = { chiTiet: c.chiTiet };

    // 3) Phiếu nhập kho (để định giá)
    const nhapRes = await this.serviceClient.get<any>('kho', '/phieu', {
      headers: authToken ? { Authorization: authToken } : undefined,
      query: { loaiPhieu: 'NHAP', limit: 1000 },
    });
    const nhapPhieu: any[] = nhapRes.success ? (nhapRes.data?.data ?? nhapRes.data ?? []) : [];
    const truncateNhap = nhapPhieu.length >= 1000;
    const nhapChiTiet = nhapPhieu.flatMap((p) => (p.chiTiet ?? []).map((ct: any) => ({
      hangHoaMa: ct.hangHoaMa, soLuong: ct.soLuong, thanhTien: ct.thanhTien,
    })));

    // 4) Engine
    const tieuHao = tinhTieuHao(rows as any, congThucByCode);
    const donGiaBq = tinhDonGiaBinhQuan(nhapChiTiet);
    const chiPhiThuc = tinhChiPhiThuc(tieuHao, donGiaBq);
    const nganSach = tinhNganSach(rows as any, dinhMucList as any);
    const haoPhi = tinhHaoPhi(nganSach, chiPhiThuc, nguongPct ?? 0);

    return {
      nganSach, chiPhiThuc, ...haoPhi, tieuHao, donGiaBq,
      canhBaoDinhGiaThieu: !nhapRes.success,
      canhBaoTruncateNhap: truncateNhap,
    };
  }

  /** Chốt tiêu hao kỳ: tạo phiếu xuất kho + bút toán giá vốn 632/152. Chưa idempotent (MVP). */
  async chotTieuHao(tuNgay?: string, denNgay?: string, authToken?: string) {
    const r = await this.chiPhi(tuNgay, denNgay, 0, authToken);
    if (!r.tieuHao.length) throw new BadRequestException('Không có tiêu hao trong kỳ để chốt');
    if (!(r.chiPhiThuc > 0)) throw new BadRequestException('Chi phí thực = 0, không thể ghi sổ giá vốn');
    if (r.canhBaoDinhGiaThieu) {
      throw new BadRequestException('Không đọc được phiếu nhập kho để định giá tiêu hao — không thể chốt');
    }
    const ngay = denNgay ?? tuNgay ?? new Date().toISOString().slice(0, 10);
    const headers = authToken ? { Authorization: authToken } : undefined;

    const xuatRes = await this.serviceClient.post<any>('kho', '/phieu', {
      headers, body: buildPhieuXuatKho(r.tieuHao, r.donGiaBq, ngay),
    });
    if (!xuatRes.success) throw new BadRequestException(`Tạo phiếu xuất kho thất bại: ${xuatRes.error?.message ?? xuatRes.error?.code ?? 'unknown'}`);

    const butRes = await this.serviceClient.post<any>('voucher', '/nhat-ky-chung', {
      headers, body: buildButToanGiaVon(r.chiPhiThuc, ngay, `Giá vốn ăn kỳ ${tuNgay ?? ''}..${denNgay ?? ''}`),
    });
    if (!butRes.success) throw new BadRequestException(`Ghi sổ giá vốn thất bại: ${butRes.error?.message ?? butRes.error?.code ?? 'unknown'}`);

    return {
      chiPhiThuc: r.chiPhiThuc,
      soPhieuXuat: xuatRes.data?.soPhieu ?? xuatRes.data?._id,
      chungTuId: butRes.data?._id ?? butRes.data?.id,
    };
  }
}
