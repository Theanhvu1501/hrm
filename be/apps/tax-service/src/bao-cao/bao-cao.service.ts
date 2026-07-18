import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { BangKeMuaVao, BangKeBanRa } from '@app/entities';
import { DieuChinhThueService } from '../dieu-chinh-thue/dieu-chinh-thue.service';
import {
  tinhThueSuatTNDN,
  tongVatTheoKy,
  tinhTNDNQuy,
  TNDNQuyResult,
} from './tax-calc';
import { quyToRange, inDateRange } from '../shared/tax-helpers';
import { buildCpKhongTru } from './chi-phi-khong-tru.util';
import {
  buildNvcsSections,
  NghiaVuChinhSach,
  NvcsVatQuy,
} from './nghia-vu-chinh-sach.util';

interface AggRow {
  ma: string;
  periodNo: number;
  periodCo: number;
}

export interface TNDNQuyData extends TNDNQuyResult {
  quy: number;
  dt511: number;
  dt515: number;
  dt711: number;
  cp632: number;
  cp641: number;
  cp642: number;
  cp811: number;
  chiPhiKhongTru: number;
  cpKhongTruAuto?: number[];
  thuNhapMien: number;
  loChuyen: number;
  doanhThuLuyKe: number;
  thueSuat: number;
}

@Injectable()
export class BaoCaoService {
  constructor(
    @InjectRepository(BangKeMuaVao)
    private readonly muaVaoRepo: Repository<BangKeMuaVao>,
    @InjectRepository(BangKeBanRa)
    private readonly banRaRepo: Repository<BangKeBanRa>,
    private readonly dieuChinhService: DieuChinhThueService,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  private sumByPrefix(
    rows: AggRow[],
    prefix: string,
    field: 'periodNo' | 'periodCo',
  ): number {
    return rows
      .filter((r) => r.ma?.startsWith(prefix))
      .reduce((s, r) => s + (Number(r[field]) || 0), 0);
  }

  /** Lấy phát sinh tài khoản theo từng quý của năm (gọi voucher-service). */
  private async aggByQuy(nam: number, authToken?: string): Promise<AggRow[][]> {
    const calls = [1, 2, 3, 4].map((q) => {
      const { start, end } = quyToRange(q, nam);
      const endInclusive = new Date(end.getTime() - 1);
      return this.serviceClient.aggregateBalance(
        start.toISOString(),
        endInclusive.toISOString(),
        authToken,
      );
    });
    const responses = await Promise.all(calls);
    return responses.map((res) => (res?.success ? res.data || [] : []));
  }

  /** Tính dữ liệu TNDN cho 4 quý + lũy kế. */
  async baoCaoTNDN(
    nam: number,
    authToken?: string,
  ): Promise<{ nam: number; quy: TNDNQuyData[]; luyKe: TNDNQuyData }> {
    const [aggQuarters, dieuChinh, autoRes] = await Promise.all([
      this.aggByQuy(nam, authToken),
      this.dieuChinhService.getOrDefault(nam),
      this.serviceClient.aggregateNonDeductible(nam, authToken),
    ]);

    const arr = (f: string, i: number): number =>
      Number(((dieuChinh as any)[f] || [])[i]) || 0;

    // Chi phí không được trừ = auto (từ chứng từ kiểm soát) + điều chỉnh tay.
    const cp = buildCpKhongTru(
      autoRes?.success ? autoRes.data || [] : [],
      dieuChinh as any,
    );

    let doanhThuLuyKe = 0;
    const quy: TNDNQuyData[] = aggQuarters.map((rows, i) => {
      const dt511 = this.sumByPrefix(rows, '511', 'periodCo');
      const dt515 = this.sumByPrefix(rows, '515', 'periodCo');
      const dt711 = this.sumByPrefix(rows, '711', 'periodCo');
      const cp632 = this.sumByPrefix(rows, '632', 'periodNo');
      const cp641 = this.sumByPrefix(rows, '641', 'periodNo');
      const cp642 = this.sumByPrefix(rows, '642', 'periodNo');
      const cp811 = this.sumByPrefix(rows, '811', 'periodNo');

      // tổng đã bao gồm cả điều chỉnh tay (tránh cộng tay hai lần).
      const chiPhiKhongTru = cp.tongPerQuy[i];
      const thuNhapMien = arr('thuNhapMienThue', i);
      const loChuyen = arr('loDuocChuyen', i);

      doanhThuLuyKe += dt511 + dt515 + dt711;
      const thueSuat = tinhThueSuatTNDN(doanhThuLuyKe);

      const r = tinhTNDNQuy({
        dt511,
        dt515,
        dt711,
        cp632,
        cp641,
        cp642,
        cp811,
        chiPhiKhongTru,
        thuNhapMien,
        loChuyen,
        thueSuat,
      });

      return {
        quy: i + 1,
        dt511,
        dt515,
        dt711,
        cp632,
        cp641,
        cp642,
        cp811,
        chiPhiKhongTru,
        cpKhongTruAuto: cp.perQuy[i],
        thuNhapMien,
        loChuyen,
        doanhThuLuyKe,
        thueSuat,
        ...r,
      };
    });

    const sum = (sel: (q: TNDNQuyData) => number): number =>
      quy.reduce((s, q) => s + sel(q), 0);

    const luyKe: TNDNQuyData = {
      quy: 0,
      dt511: sum((q) => q.dt511),
      dt515: sum((q) => q.dt515),
      dt711: sum((q) => q.dt711),
      cp632: sum((q) => q.cp632),
      cp641: sum((q) => q.cp641),
      cp642: sum((q) => q.cp642),
      cp811: sum((q) => q.cp811),
      chiPhiKhongTru: sum((q) => q.chiPhiKhongTru),
      cpKhongTruAuto: [0, 1, 2, 3].map((n) =>
        cp.perQuy.reduce((s, nhomArr) => s + (nhomArr[n] || 0), 0),
      ),
      thuNhapMien: sum((q) => q.thuNhapMien),
      loChuyen: sum((q) => q.loChuyen),
      doanhThuLuyKe,
      thueSuat: quy.length ? quy[quy.length - 1].thueSuat : 0,
      tongChiPhi: sum((q) => q.tongChiPhi),
      lnTruocThue: sum((q) => q.lnTruocThue),
      thuNhapTinhThue: sum((q) => q.thuNhapTinhThue),
      thueTNDN: sum((q) => q.thueTNDN),
      lnSauThue: sum((q) => q.lnSauThue),
    };

    return { nam, quy, luyKe };
  }

  /** Ma trận rút gọn báo cáo nghĩa vụ chính sách (TNDN/GTGT/TNCN/BHXH) theo quý + lũy kế. */
  async nghiaVuChinhSach(
    nam: number,
    authToken?: string,
  ): Promise<NghiaVuChinhSach> {
    const [tndn, muaVaoAll, banRaAll, dieuChinh] = await Promise.all([
      this.baoCaoTNDN(nam, authToken),
      this.muaVaoRepo.find({ where: this.getTenantFilter() as any }),
      this.banRaRepo.find({ where: this.getTenantFilter() as any }),
      this.dieuChinhService.getOrDefault(nam),
    ]);

    const vatPerQuy: NvcsVatQuy[] = [1, 2, 3, 4].map((q) => {
      const range = quyToRange(q, nam);
      const muaVao = muaVaoAll.filter(
        (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
      );
      const banRa = banRaAll.filter(
        (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
      );
      const vatDauVao = tongVatTheoKy(muaVao);
      const vatDauRa = tongVatTheoKy(banRa);
      return {
        vatDauVao,
        vatDauRa,
        vatPhaiNop: Math.max(0, vatDauRa - vatDauVao),
        vatConKhauTru: Math.max(0, vatDauVao - vatDauRa),
      };
    });

    return {
      nam,
      sections: buildNvcsSections(tndn, vatPerQuy, dieuChinh as any),
    };
  }

  /** Tổng hợp thuế GTGT + nghĩa vụ ngân sách cho một kỳ. */
  async tongHop(nam: number, quy: number | undefined, authToken?: string) {
    const range = quy
      ? quyToRange(quy, nam)
      : {
          start: new Date(Date.UTC(nam, 0, 1)),
          end: new Date(Date.UTC(nam + 1, 0, 1)),
        };

    const [muaVaoAll, banRaAll, tndn, dieuChinh] = await Promise.all([
      this.muaVaoRepo.find({ where: this.getTenantFilter() as any }),
      this.banRaRepo.find({ where: this.getTenantFilter() as any }),
      this.baoCaoTNDN(nam, authToken),
      this.dieuChinhService.getOrDefault(nam),
    ]);

    const muaVao = muaVaoAll.filter(
      (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
    );
    const banRa = banRaAll.filter(
      (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
    );

    const vatDauVao = tongVatTheoKy(muaVao);
    const vatDauRa = tongVatTheoKy(banRa);
    const vatPhaiNop = Math.max(0, vatDauRa - vatDauVao);
    const vatConKhauTru = Math.max(0, vatDauVao - vatDauRa);

    // Nghĩa vụ ngân sách: nếu chọn quý → lấy đúng quý; nếu cả năm → tổng 4 quý.
    const idxs = quy ? [quy - 1] : [0, 1, 2, 3];
    const sumDC = (f: string): number =>
      idxs.reduce(
        (s, i) => s + (Number(((dieuChinh as any)[f] || [])[i]) || 0),
        0,
      );
    const tndnTamTinh = quy
      ? tndn.quy[quy - 1]?.thueTNDN || 0
      : tndn.luyKe.thueTNDN;

    return {
      nam,
      quy: quy ?? null,
      vatDauVao,
      vatDauRa,
      vatPhaiNop,
      vatConKhauTru,
      nghiaVuNganSach: {
        thueTNDN: tndnTamTinh,
        vatPhaiNop,
        thueTNCN: sumDC('thueTNCN'),
        bhxh: sumDC('bhxh3383'),
        bhyt: sumDC('bhyt3384'),
        bhtn: sumDC('bhtn3386'),
      },
    };
  }
}
