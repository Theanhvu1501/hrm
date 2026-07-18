import type { NhatKyChungEntry, KqkdChiTieu, KqkdReport } from '@app/dto';
import { ServiceClient } from '@app/service-client';
import { Injectable } from '@nestjs/common';
import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
  matchLoaiBySnapshot,
  type LoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

export interface PnLEntry {
  ma: string;
  ten: string;
  soTien: number;
}

export interface PnLPeriodData {
  doanhThu: PnLEntry[];
  chiPhi: PnLEntry[];
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuan: number;
}

export interface PnLReport extends PnLPeriodData {
  kyTruoc: PnLPeriodData;
  kyHienTai: { startDate: string; endDate: string };
  kyTruocPeriod: { startDate: string; endDate: string };
}

export interface DoiTuongSoTien {
  ma: string;
  ten: string;
  soTien: number;
  // Chỉ có với đối tượng ngân hàng/quỹ (NGAN_HANG_QUY): tên tài khoản + số TK +
  // tên ngân hàng để báo cáo hiện "Tên tài khoản - Số TK".
  soTaiKhoan?: string;
  tenNganHang?: string;
  tenTaiKhoanNH?: string;
}

/** Map mã ngân hàng/quỹ → tên TK + tên ngân hàng + số TK (từ danh mục ngân hàng). */
export type NganHangByMa = Map<
  string,
  { tenTaiKhoanNH?: string; tenNganHang?: string; soTaiKhoan?: string }
>;

/**
 * Gắn số TK + tên ngân hàng cho các dòng đối tượng là ngân hàng/quỹ (khớp theo
 * mã). Đối tượng thường (KH/NCC) không đổi.
 */
export function enrichBankInfo(
  rows: DoiTuongSoTien[],
  nganHangByMa: NganHangByMa,
): DoiTuongSoTien[] {
  return rows.map((r) => {
    const nh = r.ma ? nganHangByMa.get(r.ma) : undefined;
    return nh
      ? {
          ...r,
          soTaiKhoan: nh.soTaiKhoan,
          tenNganHang: nh.tenNganHang,
          tenTaiKhoanNH: nh.tenTaiKhoanNH,
        }
      : r;
  });
}

export interface BalanceSheetEntry {
  ma: string;
  ten: string;
  soTien: number;
  doiTuongChiTiet?: DoiTuongSoTien[];
}

export interface BalanceSheetReport {
  taiSan: BalanceSheetEntry[];
  nguonVon: BalanceSheetEntry[];
  tongTaiSan: number;
  tongNguonVon: number;
  ratios: {
    currentRatio: number;
    debtToEquity: number;
  };
}

/**
 * Tính phần đóng góp của số dư đầu kỳ thủ công vào số dư 1 phía (Nợ/Có).
 * Phía NO (tài sản): duNo - duCo. Phía CO (nguồn vốn): duCo - duNo.
 */
export function openingNetForSide(
  opening: { duNo: number; duCo: number } | undefined,
  side: 'NO' | 'CO',
): number {
  if (!opening) return 0;
  return side === 'NO'
    ? opening.duNo - opening.duCo
    : opening.duCo - opening.duNo;
}

const CHUA_XAC_DINH_DOI_TUONG = 'Chưa xác định đối tượng';

/**
 * Các loại "Chi tiết theo" được xổ chi tiết theo đối tượng.
 * NGAN_HANG_QUY: ngân hàng/quỹ lưu ở danhMuc.doiTuong/doiTuong2 với
 * loai='NGAN_HANG_QUY'; số dư đầu kỳ có chiTietType tương ứng.
 * Nguồn chân lý: enum ChiTietTheo trong tai-khoan.entity.ts.
 */
export const DOI_TUONG_CHI_TIET_TYPES = new Set([
  'KHACH_HANG',
  'NHA_CUNG_CAP',
  'NHAN_VIEN',
  'NHA_THAU',
  'NGAN_HANG_QUY',
]);

/**
 * Phân rã số dư 1 tài khoản theo đối tượng cho Cân đối kế toán.
 * Cùng công thức cộng dồn như calculateAccountBalance nhưng tách theo đối tượng.
 * `openings[i].net` = phần đóng góp của số dư đầu kỳ vào phía đang xét (đã qua
 * openingNetForSide). Chỉ giữ đối tượng đúng `expectedLoai` (= chiTietTheo của TK);
 * đối tượng sai loại / thiếu loại / chứng từ không có đối tượng đều gom vào
 * "Chưa xác định đối tượng" để Σ(các dòng) = số dư TK. Bỏ dòng ~0.
 *
 * `match` quyết định "đúng loại": mặc định so theo snapshot trong chứng từ, nhưng
 * caller nên truyền matcher tra danh mục (makeLoaiMatcher) vì đối tượng có thể
 * ĐA LOẠI trong khi snapshot chỉ giữ loại chính — xem shared/doi-tuong-loai.helper.
 */
export function buildDoiTuongSoTien(
  vouchers: NhatKyChungEntry[],
  maTaiKhoan: string,
  type: 'NO' | 'CO',
  openings: Array<{ chiTietMa?: string; chiTietTen?: string; chiTietType?: string; net: number }>,
  expectedLoai: string,
  match: LoaiMatcher = matchLoaiBySnapshot,
): DoiTuongSoTien[] {
  const map = new Map<string, { ten: string; soTien: number }>();
  const add = (ma: string, ten: string, delta: number) => {
    const ex = map.get(ma) ?? { ten, soTien: 0 };
    ex.soTien += delta;
    if (!ex.ten && ten) ex.ten = ten;
    map.set(ma, ex);
  };

  for (const o of openings) {
    const ma = match(o.chiTietMa, o.chiTietType, expectedLoai) ? o.chiTietMa! : '';
    add(ma, o.chiTietTen ?? '', o.net);
  }

  for (const v of vouchers) {
    const maTKNo = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
    const maTKCo = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
    if (maTKNo === maTaiKhoan) {
      const dt = v.danhMuc?.doiTuong;
      const dtMa = match(dt?.ma, dt?.loai, expectedLoai) ? dt!.ma : '';
      add(dtMa, dtMa ? dt?.ten ?? '' : '', type === 'NO' ? v.soTien : -v.soTien);
    }
    if (maTKCo === maTaiKhoan) {
      // "Đối tượng có" ở doiTuong2; dữ liệu cũ chỉ có doiTuong → fallback
      const dt = v.danhMuc?.doiTuong2 ?? v.danhMuc?.doiTuong;
      const dtMa = match(dt?.ma, dt?.loai, expectedLoai) ? dt!.ma : '';
      add(dtMa, dtMa ? dt?.ten ?? '' : '', type === 'CO' ? v.soTien : -v.soTien);
    }
  }

  // "Chưa xác định đối tượng" (ma rỗng) luôn xếp cuối.
  return Array.from(map.entries())
    .map(([ma, val]) => ({ ma, ten: ma ? val.ten : CHUA_XAC_DINH_DOI_TUONG, soTien: val.soTien }))
    .filter((d) => Math.round(d.soTien) !== 0)
    .sort((a, b) => {
      if (a.ma === '') return 1;
      if (b.ma === '') return -1;
      return a.ma.localeCompare(b.ma);
    });
}

@Injectable()
export class BaoCaoService {
  constructor(private readonly serviceClient: ServiceClient) {}

  /**
   * Generate Profit & Loss report
   */
  async getPnL(
    startDate: Date,
    endDate: Date,
    periodType: 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
    authToken?: string,
    tenantId?: string,
  ): Promise<PnLReport> {
    const prevPeriod = this.getPreviousPeriod(startDate, endDate, periodType);

    const [vouchersHTRes, vouchersKTRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getNhatKyChung(
        prevPeriod.startDate.toISOString(),
        prevPeriod.endDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
    ]);

    const vouchersHT = vouchersHTRes.success ? vouchersHTRes.data || [] : [];
    const vouchersKT = vouchersKTRes.success ? vouchersKTRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    const revenueAccounts = accounts.filter((a) => a.ma?.startsWith('5'));
    const expenseAccounts = accounts.filter((a) => a.ma?.startsWith('6'));

    const buildPeriodData = (vouchers: NhatKyChungEntry[]): PnLPeriodData => {
      const doanhThu: PnLEntry[] = [];
      const chiPhi: PnLEntry[] = [];

      for (const account of revenueAccounts) {
        const amount = this.calculateAccountBalance(vouchers, account.ma, 'CO');
        if (amount !== 0) {
          doanhThu.push({ ma: account.ma, ten: account.ten, soTien: amount });
        }
      }

      for (const account of expenseAccounts) {
        const amount = this.calculateAccountBalance(vouchers, account.ma, 'NO');
        if (amount !== 0) {
          chiPhi.push({ ma: account.ma, ten: account.ten, soTien: amount });
        }
      }

      const tongDoanhThu = doanhThu.reduce((sum, e) => sum + e.soTien, 0);
      const tongChiPhi = chiPhi.reduce((sum, e) => sum + e.soTien, 0);

      return {
        doanhThu,
        chiPhi,
        tongDoanhThu,
        tongChiPhi,
        loiNhuan: tongDoanhThu - tongChiPhi,
      };
    };

    const currentData = buildPeriodData(vouchersHT);
    const previousData = buildPeriodData(vouchersKT);

    return {
      ...currentData,
      kyTruoc: previousData,
      kyHienTai: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kyTruocPeriod: {
        startDate: prevPeriod.startDate.toISOString(),
        endDate: prevPeriod.endDate.toISOString(),
      },
    };
  }

  /**
   * Chuỗi P&L 12 tháng của 1 năm (cho dashboard). Lấy nhật ký cả năm 1 lần rồi bucket theo tháng.
   */
  async getPnlSeries(
    year: number,
    authToken?: string,
    tenantId?: string,
    month?: number,
  ): Promise<
    { thang: number; doanhThu: number; chiPhi: number; loiNhuan: number }[]
  > {
    // month có giá trị → chia theo TUẦN trong tháng đó (Tuần 1–5); ngược lại theo 12 tháng.
    const weekly = !!month && month >= 1 && month <= 12;
    const start = weekly ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const end = weekly
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);
    const [vouchersRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        start.toISOString(),
        end.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
    ]);
    const vouchers: NhatKyChungEntry[] = vouchersRes.success
      ? vouchersRes.data || []
      : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const revenueAccounts = accounts.filter((a) => a.ma?.startsWith('5'));
    const expenseAccounts = accounts.filter((a) => a.ma?.startsWith('6'));

    const compute = (mv: NhatKyChungEntry[]) => {
      let doanhThu = 0;
      let chiPhi = 0;
      for (const a of revenueAccounts)
        doanhThu += this.calculateAccountBalance(mv, a.ma, 'CO');
      for (const a of expenseAccounts)
        chiPhi += this.calculateAccountBalance(mv, a.ma, 'NO');
      return { doanhThu, chiPhi, loiNhuan: doanhThu - chiPhi };
    };

    const out: {
      thang: number;
      doanhThu: number;
      chiPhi: number;
      loiNhuan: number;
    }[] = [];
    if (weekly) {
      for (let w = 1; w <= 5; w++) {
        const wv = vouchers.filter((v) => {
          const d = new Date(v.ngay);
          return (
            d.getFullYear() === year &&
            d.getMonth() === month - 1 &&
            Math.ceil(d.getDate() / 7) === w
          );
        });
        out.push({ thang: w, ...compute(wv) });
      }
    } else {
      for (let m = 0; m < 12; m++) {
        const mv = vouchers.filter((v) => {
          const d = new Date(v.ngay);
          return d.getFullYear() === year && d.getMonth() === m;
        });
        out.push({ thang: m + 1, ...compute(mv) });
      }
    }
    return out;
  }

  /**
   * Công nợ theo thời gian: phải thu = số dư Nợ, phải trả = số dư Có của các tài khoản
   * có gán đối tượng (chiTietTheo ∈ KH/NCC/nhà thầu/NV), lũy kế đến cuối mỗi kỳ.
   * month có giá trị → chia theo tuần trong tháng; ngược lại 12 tháng. Tính từ đầu (lũy kế).
   */
  async getCongNoSeries(
    year: number,
    authToken?: string,
    tenantId?: string,
    month?: number,
  ): Promise<{ thang: number; phaiThu: number; phaiTra: number }[]> {
    const weekly = !!month && month >= 1 && month <= 12;
    const periodEnd = weekly
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);
    const [vRes, aRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        new Date(2000, 0, 1).toISOString(),
        periodEnd.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
    ]);
    const vouchers: NhatKyChungEntry[] = vRes.success ? vRes.data || [] : [];
    const accounts = aRes.success ? aRes.data || [] : [];
    const congNoAccounts = accounts.filter(
      (a) => a.chiTietTheo && DOI_TUONG_CHI_TIET_TYPES.has(a.chiTietTheo),
    );

    const computeAt = (cutoff: Date) => {
      const upto = vouchers.filter((v) => new Date(v.ngay) <= cutoff);
      let phaiThu = 0;
      let phaiTra = 0;
      for (const a of congNoAccounts) {
        phaiThu += this.calculateAccountBalance(upto, a.ma, 'NO');
        phaiTra += this.calculateAccountBalance(upto, a.ma, 'CO');
      }
      return { phaiThu, phaiTra };
    };

    const out: { thang: number; phaiThu: number; phaiTra: number }[] = [];
    if (weekly) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let w = 1; w <= 5; w++) {
        if ((w - 1) * 7 + 1 > daysInMonth) {
          out.push({ thang: w, phaiThu: 0, phaiTra: 0 });
          continue;
        }
        const lastDay = Math.min(w * 7, daysInMonth);
        const cutoff = new Date(year, month - 1, lastDay, 23, 59, 59, 999);
        out.push({ thang: w, ...computeAt(cutoff) });
      }
    } else {
      for (let m = 1; m <= 12; m++) {
        const cutoff = new Date(year, m, 0, 23, 59, 59, 999);
        out.push({ thang: m, ...computeAt(cutoff) });
      }
    }
    return out;
  }

  /**
   * Lợi nhuận theo chiều (đối tượng/dự án/đội/sản phẩm) trong khoảng kỳ.
   * lợi nhuận(giá trị chiều) = doanh thu (Có TK 5xx) − chi phí (Nợ TK 6xx) gắn chiều đó.
   */
  async getLoiNhuanByDimension(
    startDate: Date,
    endDate: Date,
    dimension: string,
    authToken?: string,
    tenantId?: string,
  ): Promise<{ ten: string; soTien: number }[]> {
    const fieldMap: Record<string, string> = {
      'doi-tuong': 'doiTuong',
      'du-an': 'duAn',
      doi: 'doi',
      'san-pham': 'sanPham',
    };
    const field = fieldMap[dimension] || 'doiTuong';
    const vRes = await this.serviceClient.getNhatKyChung(
      startDate.toISOString(),
      endDate.toISOString(),
      authToken,
      tenantId,
    );
    const vouchers: NhatKyChungEntry[] = vRes.success ? vRes.data || [] : [];
    const map = new Map<string, { ten: string; rev: number; exp: number }>();
    for (const v of vouchers) {
      const dm = v.danhMuc as unknown as Record<
        string,
        { ma?: string; ten?: string }
      >;
      const dim = dm?.[field];
      if (!dim?.ma) continue;
      const maTKNo = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
      const maTKCo = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
      const e = map.get(dim.ma) || { ten: dim.ten || dim.ma, rev: 0, exp: 0 };
      if (maTKCo?.startsWith('5')) e.rev += v.soTien;
      if (maTKNo?.startsWith('6')) e.exp += v.soTien;
      map.set(dim.ma, e);
    }
    return Array.from(map.values())
      .map((e) => ({ ten: e.ten, soTien: e.rev - e.exp }))
      .filter((e) => e.soTien !== 0);
  }

  /**
   * Generate Balance Sheet report
   */
  async getBalanceSheet(
    asOfDate: Date,
    authToken?: string,
    tenantId?: string,
  ): Promise<BalanceSheetReport> {
    const [
      vouchersRes,
      accountsRes,
      openingRes,
      openingRawRes,
      nganHangRes,
      doiTuongRes,
    ] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        '2000-01-01',
        asOfDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
      this.serviceClient.getSoDuDauKy(authToken, tenantId),
      this.serviceClient.getSoDuDauKyRaw(authToken, tenantId),
      this.serviceClient.getNganHang(authToken, tenantId),
      this.serviceClient.getDoiTuong(authToken, tenantId),
    ]);

    // Đối tượng có thể đa loại; snapshot trong chứng từ chỉ giữ loại chính →
    // khớp "Chi tiết theo" của TK phải tra danh mục.
    const matchLoai: LoaiMatcher = doiTuongRes.success
      ? makeLoaiMatcher(buildDoiTuongLoaiIndex(doiTuongRes.data || []))
      : matchLoaiBySnapshot;

    const nganHangByMa: NganHangByMa = new Map(
      (nganHangRes.success ? nganHangRes.data || [] : []).map((n) => [
        n.ma,
        {
          tenTaiKhoanNH: n.ten,
          tenNganHang: n.nganHang || n.ten,
          soTaiKhoan: n.soTaiKhoan,
        },
      ]),
    );

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const openingItems =
      openingRes.success && openingRes.data ? openingRes.data.items || [] : [];
    const openingMap = new Map<string, { duNo: number; duCo: number }>(
      openingItems.map((o) => [
        o.maTaiKhoan,
        { duNo: Number(o.duNo) || 0, duCo: Number(o.duCo) || 0 },
      ]),
    );

    const openingRawItems =
      openingRawRes.success && openingRawRes.data ? openingRawRes.data.items || [] : [];
    const openingRawByAccount = new Map<
      string,
      Array<{ chiTietMa?: string; chiTietTen?: string; chiTietType?: string; duNo: number; duCo: number }>
    >();
    for (const o of openingRawItems) {
      const arr = openingRawByAccount.get(o.maTaiKhoan) ?? [];
      arr.push({
        chiTietMa: o.chiTietMa,
        chiTietTen: o.chiTietTen,
        chiTietType: o.chiTietType,
        duNo: Number(o.duNo) || 0,
        duCo: Number(o.duCo) || 0,
      });
      openingRawByAccount.set(o.maTaiKhoan, arr);
    }

    const assetAccounts = accounts.filter(
      (a) => a.ma?.startsWith('1') || a.ma?.startsWith('2'),
    );
    const liabilityAccounts = accounts.filter(
      (a) => a.ma?.startsWith('3') || a.ma?.startsWith('4'),
    );

    const taiSan: BalanceSheetEntry[] = [];
    const nguonVon: BalanceSheetEntry[] = [];

    // Calculate assets (debit balance)
    for (const account of assetAccounts) {
      const amount = this.calculateAccountBalance(
        vouchers,
        account.ma,
        'NO',
        openingNetForSide(openingMap.get(account.ma), 'NO'),
      );
      if (amount !== 0) {
        taiSan.push({ ma: account.ma, ten: account.ten, soTien: amount });
        if (account.chiTietTheo && DOI_TUONG_CHI_TIET_TYPES.has(account.chiTietTheo)) {
          const dt = buildDoiTuongSoTien(
            vouchers,
            account.ma,
            'NO',
            (openingRawByAccount.get(account.ma) ?? []).map((o) => ({
              chiTietMa: o.chiTietMa,
              chiTietTen: o.chiTietTen,
              chiTietType: o.chiTietType,
              net: openingNetForSide({ duNo: o.duNo, duCo: o.duCo }, 'NO'),
            })),
            account.chiTietTheo,
            matchLoai,
          );
          if (dt.length > 0)
            taiSan[taiSan.length - 1].doiTuongChiTiet = enrichBankInfo(dt, nganHangByMa);
        }
      }
    }

    // Calculate liabilities & equity (credit balance)
    for (const account of liabilityAccounts) {
      const amount = this.calculateAccountBalance(
        vouchers,
        account.ma,
        'CO',
        openingNetForSide(openingMap.get(account.ma), 'CO'),
      );
      if (amount !== 0) {
        nguonVon.push({ ma: account.ma, ten: account.ten, soTien: amount });
        if (account.chiTietTheo && DOI_TUONG_CHI_TIET_TYPES.has(account.chiTietTheo)) {
          const dt = buildDoiTuongSoTien(
            vouchers,
            account.ma,
            'CO',
            (openingRawByAccount.get(account.ma) ?? []).map((o) => ({
              chiTietMa: o.chiTietMa,
              chiTietTen: o.chiTietTen,
              chiTietType: o.chiTietType,
              net: openingNetForSide({ duNo: o.duNo, duCo: o.duCo }, 'CO'),
            })),
            account.chiTietTheo,
            matchLoai,
          );
          if (dt.length > 0)
            nguonVon[nguonVon.length - 1].doiTuongChiTiet = enrichBankInfo(dt, nganHangByMa);
        }
      }
    }

    const tongTaiSan = taiSan.reduce((sum, e) => sum + e.soTien, 0);
    const tongNguonVon = nguonVon.reduce((sum, e) => sum + e.soTien, 0);

    // Calculate ratios
    const currentAssets = taiSan
      .filter((a) => a.ma.startsWith('1'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const currentLiabilities = nguonVon
      .filter((a) => a.ma.startsWith('31'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const totalDebt = nguonVon
      .filter((a) => a.ma.startsWith('3'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const equity = nguonVon
      .filter((a) => a.ma.startsWith('4'))
      .reduce((sum, e) => sum + e.soTien, 0);

    return {
      taiSan,
      nguonVon,
      tongTaiSan,
      tongNguonVon,
      ratios: {
        currentRatio:
          currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
        debtToEquity: equity > 0 ? totalDebt / equity : 0,
      },
    };
  }

  /**
   * Generate KQKD (Income Statement) report
   */
  async getKqkd(
    startDate: Date,
    endDate: Date,
    periodType: 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
    authToken?: string,
    tenantId?: string,
  ): Promise<KqkdReport> {
    const prevPeriod = this.getPreviousPeriod(startDate, endDate, periodType);

    const [vouchersHTRes, vouchersKTRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getNhatKyChung(
        prevPeriod.startDate.toISOString(),
        prevPeriod.endDate.toISOString(),
        authToken,
        tenantId,
      ),
    ]);

    const vouchersHT = vouchersHTRes.success ? vouchersHTRes.data || [] : [];
    const vouchersKT = vouchersKTRes.success ? vouchersKTRes.data || [] : [];

    // Current period indicators
    const m01_ht = this.sumByAccountPrefix(vouchersHT, '511', 'CO');
    const m02_ht = this.sumByAccountPrefix(vouchersHT, '521', 'NO');
    const m10_ht = m01_ht - m02_ht;
    const m11_ht = this.sumByAccountPrefix(vouchersHT, '632', 'NO');
    const m20_ht = m10_ht - m11_ht;
    const m21_ht = this.sumByAccountPrefix(vouchersHT, '515', 'CO');
    const m22_ht = this.sumByAccountPrefix(vouchersHT, '635', 'NO');
    const m25_ht = this.sumByAccountPrefix(vouchersHT, '641', 'NO');
    const m26_ht = this.sumByAccountPrefix(vouchersHT, '642', 'NO');
    const m30_ht = m20_ht + (m21_ht - m22_ht) - (m25_ht + m26_ht);
    const m31_ht = this.sumByAccountPrefix(vouchersHT, '711', 'CO');
    const m32_ht = this.sumByAccountPrefix(vouchersHT, '811', 'NO');
    const m40_ht = m31_ht - m32_ht;
    const m50_ht = m30_ht + m40_ht;
    const m51_ht = this.sumByAccountPrefix(vouchersHT, '8211', 'NO');
    const m52_ht = this.sumByAccountPrefix(vouchersHT, '8212', 'NO');
    const m60_ht = m50_ht - m51_ht - m52_ht;

    // Previous period indicators
    const m01_kt = this.sumByAccountPrefix(vouchersKT, '511', 'CO');
    const m02_kt = this.sumByAccountPrefix(vouchersKT, '521', 'NO');
    const m10_kt = m01_kt - m02_kt;
    const m11_kt = this.sumByAccountPrefix(vouchersKT, '632', 'NO');
    const m20_kt = m10_kt - m11_kt;
    const m21_kt = this.sumByAccountPrefix(vouchersKT, '515', 'CO');
    const m22_kt = this.sumByAccountPrefix(vouchersKT, '635', 'NO');
    const m25_kt = this.sumByAccountPrefix(vouchersKT, '641', 'NO');
    const m26_kt = this.sumByAccountPrefix(vouchersKT, '642', 'NO');
    const m30_kt = m20_kt + (m21_kt - m22_kt) - (m25_kt + m26_kt);
    const m31_kt = this.sumByAccountPrefix(vouchersKT, '711', 'CO');
    const m32_kt = this.sumByAccountPrefix(vouchersKT, '811', 'NO');
    const m40_kt = m31_kt - m32_kt;
    const m50_kt = m30_kt + m40_kt;
    const m51_kt = this.sumByAccountPrefix(vouchersKT, '8211', 'NO');
    const m52_kt = this.sumByAccountPrefix(vouchersKT, '8212', 'NO');
    const m60_kt = m50_kt - m51_kt - m52_kt;

    // Derived column helpers
    const dtThuan_ht = m10_ht;
    const dtThuan_kt = m10_kt;
    const tongCP_ht = m22_ht + m25_ht + m26_ht;
    const tongCP_kt = m22_kt + m25_kt + m26_kt;

    const pctDT = (v: number, dt: number): number | null =>
      dt !== 0 ? (v / dt) * 100 : null;
    const tyTrong = (v: number, tcp: number): number | null =>
      tcp !== 0 ? (v / tcp) * 100 : null;
    const bienDong = (ht: number, kt: number): number => ht - kt;
    const pctBD = (ht: number, kt: number): number | null =>
      kt !== 0 ? ((ht - kt) / Math.abs(kt)) * 100 : null;

    const buildRow = (
      ma: string,
      ten: string,
      ht: number,
      kt: number,
      isCalculated: boolean,
      isBold: boolean,
      hasTyTrong: boolean,
    ): KqkdChiTieu => ({
      ma,
      ten,
      kyHienTai: ht,
      phanTramDTThuan: pctDT(ht, dtThuan_ht),
      tyTrongChiPhi: hasTyTrong ? tyTrong(ht, tongCP_ht) : null,
      kyTruoc: kt,
      phanTramDTThuanKyTruoc: pctDT(kt, dtThuan_kt),
      tyTrongChiPhiKyTruoc: hasTyTrong ? tyTrong(kt, tongCP_kt) : null,
      bienDong: bienDong(ht, kt),
      phanTramBienDong: pctBD(ht, kt),
      isCalculated,
      isBold,
    });

    const chiTieu: KqkdChiTieu[] = [
      buildRow('01', 'Doanh thu bán hàng và cung cấp dịch vụ', m01_ht, m01_kt, false, false, false),
      buildRow('02', 'Các khoản giảm trừ doanh thu', m02_ht, m02_kt, false, false, false),
      buildRow('10', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', m10_ht, m10_kt, true, true, false),
      buildRow('11', 'Giá vốn hàng bán', m11_ht, m11_kt, false, false, false),
      buildRow('20', 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', m20_ht, m20_kt, true, true, false),
      buildRow('21', 'Doanh thu hoạt động tài chính', m21_ht, m21_kt, false, false, false),
      buildRow('22', 'Chi phí tài chính', m22_ht, m22_kt, false, false, true),
      buildRow('25', 'Chi phí bán hàng', m25_ht, m25_kt, false, false, true),
      buildRow('26', 'Chi phí quản lý doanh nghiệp', m26_ht, m26_kt, false, false, true),
      buildRow('30', 'Lợi nhuận thuần từ hoạt động kinh doanh', m30_ht, m30_kt, true, true, false),
      buildRow('31', 'Thu nhập khác', m31_ht, m31_kt, false, false, false),
      buildRow('32', 'Chi phí khác', m32_ht, m32_kt, false, false, false),
      buildRow('40', 'Lợi nhuận khác', m40_ht, m40_kt, true, true, false),
      buildRow('50', 'Tổng lợi nhuận kế toán trước thuế', m50_ht, m50_kt, true, true, false),
      buildRow('51', 'Chi phí thuế TNDN hiện hành', m51_ht, m51_kt, false, false, false),
      buildRow('52', 'Chi phí thuế TNDN hoãn lại', m52_ht, m52_kt, false, false, false),
      buildRow('60', 'Lợi nhuận sau thuế thu nhập doanh nghiệp', m60_ht, m60_kt, true, true, false),
    ];

    return {
      chiTieu,
      kyHienTai: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kyTruoc: {
        startDate: prevPeriod.startDate.toISOString(),
        endDate: prevPeriod.endDate.toISOString(),
      },
    };
  }

  private getPreviousPeriod(
    startDate: Date,
    endDate: Date,
    periodType: 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
  ): { startDate: Date; endDate: Date } {
    const prevStart = new Date(startDate);
    const prevEnd = new Date(endDate);

    switch (periodType) {
      case 'ngay': {
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        const prevEndDate = new Date(endDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        return { startDate: prevStartDate, endDate: prevEndDate };
      }
      case 'thang': {
        const prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
        const prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
        return { startDate: prevStartDate, endDate: prevEndDate };
      }
      case 'quy': {
        const prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 3, 1);
        const prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
        return { startDate: prevStartDate, endDate: prevEndDate };
      }
      case 'nam':
        prevStart.setFullYear(prevStart.getFullYear() - 1);
        prevEnd.setFullYear(prevEnd.getFullYear() - 1);
        break;
      case 'tuyChon': {
        const durationMs = endDate.getTime() - startDate.getTime();
        prevStart.setTime(startDate.getTime() - durationMs);
        prevEnd.setTime(endDate.getTime() - durationMs);
        break;
      }
    }

    return { startDate: prevStart, endDate: prevEnd };
  }

  private sumByAccountPrefix(
    vouchers: NhatKyChungEntry[],
    prefix: string,
    side: 'NO' | 'CO',
  ): number {
    let sum = 0;

    for (const v of vouchers) {
      if (side === 'NO') {
        const maTK = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
        if (maTK?.startsWith(prefix)) {
          sum += v.soTien;
        }
      } else {
        const maTK = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
        if (maTK?.startsWith(prefix)) {
          sum += v.soTien;
        }
      }
    }

    return sum;
  }

  private calculateAccountBalance(
    vouchers: NhatKyChungEntry[],
    maTaiKhoan: string,
    type: 'NO' | 'CO',
    openingNet = 0,
  ): number {
    let balance = openingNet;

    for (const v of vouchers) {
      const maTKNo = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
      const maTKCo = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;

      if (maTKNo === maTaiKhoan) {
        balance += type === 'NO' ? v.soTien : -v.soTien;
      }
      if (maTKCo === maTaiKhoan) {
        balance += type === 'CO' ? v.soTien : -v.soTien;
      }
    }

    return Math.max(0, balance);
  }
}
