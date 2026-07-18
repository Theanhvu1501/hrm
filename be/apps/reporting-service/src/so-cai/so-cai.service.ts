import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import type { TaiKhoanResponse, NhatKyChungEntry } from '@app/dto';
import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
  matchLoaiBySnapshot,
  type LoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

export interface SoCaiEntry {
  ngay: Date;
  soPhieu: string;
  noiDung: string;
  no: number;
  co: number;
  soDu: number;
}

export interface LedgerReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  soDuDauKy: number;
  entries: SoCaiEntry[];
  tongNo: number;
  tongCo: number;
  soDuCuoiKy: number;
}

export interface TrialBalanceEntry {
  ma: string;
  ten: string;
  noDauKy: number;
  coDauKy: number;
  noPhatSinh: number;
  coPhatSinh: number;
  noCuoiKy: number;
  coCuoiKy: number;
  doiTuongChiTiet?: TrialBalanceEntry[];
  // Chỉ có với đối tượng ngân hàng/quỹ: tên tài khoản + số TK + tên ngân hàng
  // (báo cáo hiện "Tên tài khoản - Số TK").
  soTaiKhoan?: string;
  tenNganHang?: string;
  tenTaiKhoanNH?: string;
}

export interface AggBucket {
  priorNo: number;
  priorCo: number;
  periodNo: number;
  periodCo: number;
}

export interface OpeningBucket {
  duNo: number;
  duCo: number;
}

/**
 * Tính 1 dòng bảng cân đối phát sinh, cộng số dư đầu kỳ thủ công (opening)
 * vào prior bucket trước khi phân loại dư Nợ/Có theo loại tài khoản.
 */
export function computeTrialRow(
  agg: AggBucket,
  opening: OpeningBucket,
  loai: string,
): {
  noDauKy: number;
  coDauKy: number;
  noPhatSinh: number;
  coPhatSinh: number;
  noCuoiKy: number;
  coCuoiKy: number;
} {
  const calcBalance = (
    no: number,
    co: number,
    l: string,
  ): { duNo: number; duCo: number } => {
    if (l === 'NO') {
      const net = no - co;
      return net >= 0 ? { duNo: net, duCo: 0 } : { duNo: 0, duCo: -net };
    } else {
      const net = co - no;
      return net >= 0 ? { duNo: 0, duCo: net } : { duNo: -net, duCo: 0 };
    }
  };

  const priorNo = agg.priorNo + opening.duNo;
  const priorCo = agg.priorCo + opening.duCo;

  const dauKy = calcBalance(priorNo, priorCo, loai);
  const cuoiKy = calcBalance(
    priorNo + agg.periodNo,
    priorCo + agg.periodCo,
    loai,
  );

  return {
    noDauKy: dauKy.duNo,
    coDauKy: dauKy.duCo,
    noPhatSinh: agg.periodNo,
    coPhatSinh: agg.periodCo,
    noCuoiKy: cuoiKy.duNo,
    coCuoiKy: cuoiKy.duCo,
  };
}

export interface DoiTuongAgg {
  doiTuongMa: string | null;
  doiTuongTen: string | null;
  doiTuongLoai: string | null;
  priorNo: number;
  priorCo: number;
  periodNo: number;
  periodCo: number;
}

export interface DoiTuongOpening {
  doiTuongMa: string | null;
  doiTuongTen: string | null;
  chiTietType: string | null;
  duNo: number;
  duCo: number;
}

const CHUA_XAC_DINH_DOI_TUONG = 'Chưa xác định đối tượng';

/**
 * Các loại "Chi tiết theo" được xổ chi tiết theo đối tượng.
 * NGAN_HANG_QUY: chứng từ lưu ngân hàng/quỹ vào danhMuc.doiTuong/doiTuong2
 * với loai='NGAN_HANG_QUY' (từ form NKC); số dư đầu kỳ có chiTietType tương ứng.
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
 * Dựng các dòng chi tiết theo đối tượng cho 1 tài khoản (cân đối phát sinh).
 * Mỗi đối tượng tính như 1 "tài khoản con" qua computeTrialRow; ma rỗng + tên
 * "Chưa xác định đối tượng" cho phần chứng từ/đầu kỳ không gắn đối tượng.
 * Bỏ các dòng toàn 0. Σ phát sinh các dòng = phát sinh của TK.
 */
export function buildDoiTuongRows(
  loai: string,
  aggs: DoiTuongAgg[],
  openings: DoiTuongOpening[],
  expectedLoai: string,
  match: LoaiMatcher = matchLoaiBySnapshot,
): TrialBalanceEntry[] {
  const keyOf = (dt: string | null) => dt ?? '';
  // Đối tượng SAI loại (hoặc thiếu loại) so với "Chi tiết theo" của TK được gộp
  // vào dòng "Chưa xác định đối tượng" (doiTuongMa=null) để Σ con = số dư TK.
  // Đúng loại hay không do `match` quyết định (mặc định: so theo snapshot; caller
  // nên truyền matcher tra danh mục vì đối tượng có thể đa loại).
  const normAgg = (a: DoiTuongAgg): DoiTuongAgg =>
    match(a.doiTuongMa, a.doiTuongLoai, expectedLoai)
      ? a
      : { ...a, doiTuongMa: null, doiTuongTen: null };
  const normOpen = (o: DoiTuongOpening): DoiTuongOpening =>
    match(o.doiTuongMa, o.chiTietType, expectedLoai)
      ? o
      : { ...o, doiTuongMa: null, doiTuongTen: null };
  // Cộng dồn khi trùng khóa để hàm tự khớp tổng dù caller truyền list chưa gom.
  const aggMap = new Map<string, DoiTuongAgg>();
  for (const raw of aggs) {
    const a = normAgg(raw);
    const k = keyOf(a.doiTuongMa);
    const ex = aggMap.get(k);
    if (ex) {
      ex.priorNo += a.priorNo;
      ex.priorCo += a.priorCo;
      ex.periodNo += a.periodNo;
      ex.periodCo += a.periodCo;
    } else {
      aggMap.set(k, { ...a });
    }
  }
  const openMap = new Map<string, DoiTuongOpening>();
  for (const raw of openings) {
    const o = normOpen(raw);
    const k = keyOf(o.doiTuongMa);
    const ex = openMap.get(k);
    if (ex) {
      ex.duNo += o.duNo;
      ex.duCo += o.duCo;
    } else {
      openMap.set(k, { ...o });
    }
  }

  const keys = new Set<string>([...aggMap.keys(), ...openMap.keys()]);
  const rows: TrialBalanceEntry[] = [];

  for (const k of keys) {
    const a = aggMap.get(k);
    const o = openMap.get(k);
    const row = computeTrialRow(
      {
        priorNo: a?.priorNo ?? 0,
        priorCo: a?.priorCo ?? 0,
        periodNo: a?.periodNo ?? 0,
        periodCo: a?.periodCo ?? 0,
      },
      { duNo: o?.duNo ?? 0, duCo: o?.duCo ?? 0 },
      loai,
    );
    const doiTuongMa = a?.doiTuongMa ?? o?.doiTuongMa ?? null;
    const doiTuongTen = a?.doiTuongTen ?? o?.doiTuongTen ?? null;
    rows.push({
      ma: doiTuongMa ?? '',
      ten: doiTuongMa ? doiTuongTen ?? '' : CHUA_XAC_DINH_DOI_TUONG,
      ...row,
    });
  }

  const isZero = (r: TrialBalanceEntry) =>
    !r.noDauKy && !r.coDauKy && !r.noPhatSinh && !r.coPhatSinh && !r.noCuoiKy && !r.coCuoiKy;

  // "Chưa xác định đối tượng" (ma rỗng) luôn xếp cuối.
  return rows
    .filter((r) => !isZero(r))
    .sort((x, y) => {
      if (x.ma === '') return 1;
      if (y.ma === '') return -1;
      return x.ma.localeCompare(y.ma);
    });
}

export type TrialAmounts = Pick<
  TrialBalanceEntry,
  'noDauKy' | 'coDauKy' | 'noPhatSinh' | 'coPhatSinh' | 'noCuoiKy' | 'coCuoiKy'
>;

/**
 * Cộng dồn các dòng con thành số của dòng cha — cộng RIÊNG từng cột Nợ/Có,
 * KHÔNG bù trừ Nợ với Có. Dùng cho TK có chi tiết đối tượng: dư Nợ TK = Σ dư Nợ
 * từng đối tượng, dư Có TK = Σ dư Có từng đối tượng (KH A dư Nợ 100 + KH B dư Có
 * 30 ⇒ TK dư Nợ 100 / dư Có 30, không phải dư Nợ 70).
 */
export function sumTrialRows(rows: TrialAmounts[]): TrialAmounts {
  return rows.reduce<TrialAmounts>(
    (acc, r) => ({
      noDauKy: acc.noDauKy + r.noDauKy,
      coDauKy: acc.coDauKy + r.coDauKy,
      noPhatSinh: acc.noPhatSinh + r.noPhatSinh,
      coPhatSinh: acc.coPhatSinh + r.coPhatSinh,
      noCuoiKy: acc.noCuoiKy + r.noCuoiKy,
      coCuoiKy: acc.coCuoiKy + r.coCuoiKy,
    }),
    {
      noDauKy: 0,
      coDauKy: 0,
      noPhatSinh: 0,
      coPhatSinh: 0,
      noCuoiKy: 0,
      coCuoiKy: 0,
    },
  );
}

/**
 * Helper to extract taiKhoanNo from voucher entry
 * Supports both legacy field and new danhMuc structure
 */
function getTaiKhoanNo(v: NhatKyChungEntry): string {
  return v.taiKhoanNo || v.danhMuc?.taiKhoanNo?.ma || '';
}

/**
 * Helper to extract taiKhoanCo from voucher entry
 * Supports both legacy field and new danhMuc structure
 */
function getTaiKhoanCo(v: NhatKyChungEntry): string {
  return v.taiKhoanCo || v.danhMuc?.taiKhoanCo?.ma || '';
}

@Injectable()
export class SoCaiService {
  constructor(private readonly serviceClient: ServiceClient) {}

  /**
   * Get general ledger for a specific account
   */
  async getLedger(
    maTaiKhoan: string,
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<LedgerReport> {
    const [vouchersRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    const account = accounts.find((a) => a.ma === maTaiKhoan);
    if (!account) {
      return {
        taiKhoan: { ma: maTaiKhoan, ten: 'Unknown', loai: 'NO' },
        soDuDauKy: 0,
        entries: [],
        tongNo: 0,
        tongCo: 0,
        soDuCuoiKy: 0,
      };
    }

    // Filter vouchers that affect this account
    const relevantVouchers = vouchers.filter(
      (v) => getTaiKhoanNo(v) === maTaiKhoan || getTaiKhoanCo(v) === maTaiKhoan,
    );

    // Calculate running balance based on account type
    const entries: SoCaiEntry[] = [];
    let soDu = 0;
    let tongNo = 0;
    let tongCo = 0;

    const sorted = [...relevantVouchers].sort(
      (a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
    );

    for (const v of sorted) {
      const no = getTaiKhoanNo(v) === maTaiKhoan ? v.soTien : 0;
      const co = getTaiKhoanCo(v) === maTaiKhoan ? v.soTien : 0;

      // For debit accounts (NO): balance increases with debits
      // For credit accounts (CO): balance increases with credits
      if (account.loai === 'NO') {
        soDu = soDu + no - co;
      } else {
        soDu = soDu + co - no;
      }

      tongNo += no;
      tongCo += co;

      entries.push({
        ngay: new Date(v.ngay),
        soPhieu: v.soPhieu,
        noiDung: v.noiDung,
        no,
        co,
        soDu,
      });
    }

    return {
      taiKhoan: { ma: account.ma, ten: account.ten, loai: account.loai },
      soDuDauKy: 0,
      entries,
      tongNo,
      tongCo,
      soDuCuoiKy: soDu,
    };
  }

  /**
   * Get all ledger entries across all accounts
   */
  async getAll(authToken?: string): Promise<LedgerReport[]> {
    const [vouchersRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(undefined, undefined, authToken),
      this.serviceClient.getTaiKhoan(authToken),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    const reports: LedgerReport[] = [];

    for (const account of accounts) {
      const relevantVouchers = vouchers.filter(
        (v) =>
          getTaiKhoanNo(v) === account.ma || getTaiKhoanCo(v) === account.ma,
      );

      if (relevantVouchers.length === 0) continue;

      const entries: SoCaiEntry[] = [];
      let soDu = 0;
      let tongNo = 0;
      let tongCo = 0;

      const sorted = [...relevantVouchers].sort(
        (a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
      );

      for (const v of sorted) {
        const no = getTaiKhoanNo(v) === account.ma ? v.soTien : 0;
        const co = getTaiKhoanCo(v) === account.ma ? v.soTien : 0;

        if (account.loai === 'NO') {
          soDu = soDu + no - co;
        } else {
          soDu = soDu + co - no;
        }

        tongNo += no;
        tongCo += co;

        entries.push({
          ngay: new Date(v.ngay),
          soPhieu: v.soPhieu,
          noiDung: v.noiDung,
          no,
          co,
          soDu,
        });
      }

      reports.push({
        taiKhoan: { ma: account.ma, ten: account.ten, loai: account.loai },
        soDuDauKy: 0,
        entries,
        tongNo,
        tongCo,
        soDuCuoiKy: soDu,
      });
    }

    return reports;
  }

  /**
   * Get summary by account
   */
  async getSummaryByAccount(authToken?: string): Promise<
    {
      ma: string;
      ten: string;
      soDuDauKy: number;
      phatSinh: number;
      soDuCuoiKy: number;
    }[]
  > {
    const reports = await this.getAll(authToken);
    return reports.map((r) => ({
      ma: r.taiKhoan.ma,
      ten: r.taiKhoan.ten,
      soDuDauKy: r.soDuDauKy,
      phatSinh: r.tongNo + r.tongCo,
      soDuCuoiKy: r.soDuCuoiKy,
    }));
  }

  /**
   * Get ledger statistics
   */
  async getStats(authToken?: string): Promise<{
    soTaiKhoan: number;
    tongPhatSinhNo: number;
    tongPhatSinhCo: number;
    canDoi: boolean;
  }> {
    const reports = await this.getAll(authToken);
    const tongPhatSinhNo = reports.reduce((sum, r) => sum + r.tongNo, 0);
    const tongPhatSinhCo = reports.reduce((sum, r) => sum + r.tongCo, 0);

    return {
      soTaiKhoan: reports.length,
      tongPhatSinhNo,
      tongPhatSinhCo,
      canDoi: tongPhatSinhNo === tongPhatSinhCo,
    };
  }

  /**
   * Generate trial balance report using DB aggregation
   * 1 HTTP call to voucher-service instead of fetching all raw records
   */
  async getTrialBalance(
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<{ entries: TrialBalanceEntry[]; totals: TrialBalanceEntry }> {
    const [
      aggRes,
      accountsRes,
      openingRes,
      dtAggRes,
      openingRawRes,
      nganHangRes,
      doiTuongRes,
    ] = await Promise.all([
      this.serviceClient.aggregateBalance(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
      this.serviceClient.getSoDuDauKy(authToken),
      this.serviceClient.aggregateBalanceByDoiTuong(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getSoDuDauKyRaw(authToken),
      this.serviceClient.getNganHang(authToken),
      this.serviceClient.getDoiTuong(authToken),
    ]);

    // Đối tượng đa loại: snapshot chỉ giữ loại chính → tra danh mục để khớp
    // "Chi tiết theo" của TK.
    const matchLoai: LoaiMatcher = doiTuongRes.success
      ? makeLoaiMatcher(buildDoiTuongLoaiIndex(doiTuongRes.data || []))
      : matchLoaiBySnapshot;

    // Map mã ngân hàng/quỹ → tên TK + tên NH + số TK (hiện "Tên tài khoản - Số TK").
    const nganHangByMa = new Map<
      string,
      { tenTaiKhoanNH?: string; tenNganHang?: string; soTaiKhoan?: string }
    >(
      (nganHangRes.success ? nganHangRes.data || [] : []).map((n) => [
        n.ma,
        {
          tenTaiKhoanNH: n.ten,
          tenNganHang: n.nganHang || n.ten,
          soTaiKhoan: n.soTaiKhoan,
        },
      ]),
    );

    const aggData = aggRes.success ? aggRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const openingItems =
      openingRes.success && openingRes.data ? openingRes.data.items || [] : [];
    const dtAggData = dtAggRes.success ? dtAggRes.data || [] : [];
    const openingRawItems =
      openingRawRes.success && openingRawRes.data ? openingRawRes.data.items || [] : [];

    // Gom đối tượng theo mã tài khoản
    const dtAggByAccount = new Map<string, DoiTuongAgg[]>();
    for (const d of dtAggData) {
      const arr = dtAggByAccount.get(d.ma) ?? [];
      arr.push({
        doiTuongMa: d.doiTuongMa,
        doiTuongTen: d.doiTuongTen,
        doiTuongLoai: d.doiTuongLoai,
        priorNo: d.priorNo,
        priorCo: d.priorCo,
        periodNo: d.periodNo,
        periodCo: d.periodCo,
      });
      dtAggByAccount.set(d.ma, arr);
    }

    // Gom opening đối tượng theo (mã TK, mã đối tượng)
    const dtOpeningByAccount = new Map<string, Map<string, DoiTuongOpening>>();
    for (const o of openingRawItems) {
      const accMap = dtOpeningByAccount.get(o.maTaiKhoan) ?? new Map<string, DoiTuongOpening>();
      const dtKey = o.chiTietMa ?? '';
      const ex = accMap.get(dtKey) ?? {
        doiTuongMa: o.chiTietMa ?? null,
        doiTuongTen: o.chiTietTen ?? null,
        chiTietType: o.chiTietType ?? null,
        duNo: 0,
        duCo: 0,
      };
      ex.duNo += Number(o.duNo) || 0;
      ex.duCo += Number(o.duCo) || 0;
      accMap.set(dtKey, ex);
      dtOpeningByAccount.set(o.maTaiKhoan, accMap);
    }

    // Build account lookup map
    const accountMap = new Map(accounts.map((a) => [a.ma, a]));
    const aggMap = new Map(aggData.map((a) => [a.ma, a]));
    const openingMap = new Map<string, OpeningBucket>(
      openingItems.map((o) => [
        o.maTaiKhoan,
        { duNo: Number(o.duNo) || 0, duCo: Number(o.duCo) || 0 },
      ]),
    );

    const entries: TrialBalanceEntry[] = [];
    let totalNoDauKy = 0, totalCoDauKy = 0;
    let totalNoPhatSinh = 0, totalCoPhatSinh = 0;
    let totalNoCuoiKy = 0, totalCoCuoiKy = 0;

    // Union: tài khoản có phát sinh HOẶC có số dư đầu kỳ
    const allMas = new Set<string>([...aggMap.keys(), ...openingMap.keys()]);

    for (const ma of allMas) {
      const account = accountMap.get(ma);
      if (!account) continue;

      const agg =
        aggMap.get(ma) ?? { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 };
      const opening = openingMap.get(ma) ?? { duNo: 0, duCo: 0 };

      // Số của chính TK: bù trừ Nợ/Có trên tổng phát sinh của TK.
      let row: TrialAmounts = computeTrialRow(
        {
          priorNo: agg.priorNo,
          priorCo: agg.priorCo,
          periodNo: agg.periodNo,
          periodCo: agg.periodCo,
        },
        opening,
        account.loai,
      );

      const dtRows =
        account.chiTietTheo && DOI_TUONG_CHI_TIET_TYPES.has(account.chiTietTheo)
          ? buildDoiTuongRows(
              account.loai,
              dtAggByAccount.get(ma) ?? [],
              Array.from(
                (dtOpeningByAccount.get(ma) ?? new Map<string, DoiTuongOpening>()).values(),
              ),
              account.chiTietTheo,
              matchLoai,
            )
          : [];

      // TK có chi tiết đối tượng: mỗi đối tượng tự bù trừ Nợ/Có (công thức cũ),
      // còn TK mẹ = Σ các dòng đối tượng — KHÔNG bù trừ giữa các đối tượng với
      // nhau (KH A dư Nợ, KH B dư Có phải hiện cả 2 chiều). Chỉ thay khi có dòng
      // chi tiết; nếu không lấy được chi tiết thì giữ nguyên số bù trừ của TK để
      // không làm dòng TK về 0.
      if (dtRows.length > 0) {
        row = sumTrialRows(dtRows);
      }

      entries.push({ ma, ten: account.ten, ...row });

      if (dtRows.length > 0) {
        entries[entries.length - 1].doiTuongChiTiet = dtRows.map((r) => {
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

      totalNoDauKy += row.noDauKy;
      totalCoDauKy += row.coDauKy;
      totalNoPhatSinh += row.noPhatSinh;
      totalCoPhatSinh += row.coPhatSinh;
      totalNoCuoiKy += row.noCuoiKy;
      totalCoCuoiKy += row.coCuoiKy;
    }

    entries.sort((a, b) => a.ma.localeCompare(b.ma));

    return {
      entries,
      totals: {
        ma: '',
        ten: 'Tổng cộng',
        noDauKy: totalNoDauKy,
        coDauKy: totalCoDauKy,
        noPhatSinh: totalNoPhatSinh,
        coPhatSinh: totalCoPhatSinh,
        noCuoiKy: totalNoCuoiKy,
        coCuoiKy: totalCoCuoiKy,
      },
    };
  }
}
