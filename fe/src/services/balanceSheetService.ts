import { ServiceBase } from './base/service-base';

// ============ BE Response Types ============

export interface DoiTuongSoTienResponse {
  ma: string;
  ten: string;
  soTien: number;
  soTaiKhoan?: string;
  tenNganHang?: string;
  /** Tên tài khoản trong danh mục ngân hàng (chỉ có với đối tượng ngân hàng/quỹ). */
  tenTaiKhoanNH?: string;
}

interface BalanceSheetEntryResponse {
  ma: string;
  ten: string;
  soTien: number;
  doiTuongChiTiet?: DoiTuongSoTienResponse[];
}

interface BalanceSheetResponse {
  taiSan: BalanceSheetEntryResponse[];
  nguonVon: BalanceSheetEntryResponse[];
  tongTaiSan: number;
  tongNguonVon: number;
  ratios: {
    currentRatio: number;
    debtToEquity: number;
  };
}

// ============ FE Display Types ============

export interface BalanceSheetItem {
  ma: string;
  tenChiTieu: string;
  dauNam: number;
  cuoiKy: number;
  level: number;
  isSection?: boolean;
  isTotal?: boolean;
  doiTuongChiTiet?: DoiTuongSoTienResponse[];
}

export interface BalanceSheetData {
  taiSan: BalanceSheetItem[];
  nguonVon: BalanceSheetItem[];
  tongTaiSan: { dauNam: number; cuoiKy: number };
  tongNguonVon: { dauNam: number; cuoiKy: number };
  canDoi: boolean;
}

export interface BalanceSheetStats {
  tongTaiSan: number;
  tongNguonVon: number;
  taiSanNganHan: number;
  taiSanDaiHan: number;
  noPhaiTra: number;
  vonChuSoHuu: number;
  tyLeNoTrenVon: number;
  tyLeTaiSanNganHan: number;
  canDoi: boolean;
  ratios: {
    currentRatio: number;
    debtToEquity: number;
  };
}

// ============ Helpers ============

function mapEntriesToItems(entries: BalanceSheetEntryResponse[], groupLabel: string, groupMa: string): BalanceSheetItem[] {
  const items: BalanceSheetItem[] = [];

  // Section header
  items.push({
    ma: groupMa,
    tenChiTieu: groupLabel,
    dauNam: 0,
    cuoiKy: entries.reduce((sum, e) => sum + e.soTien, 0),
    level: 0,
    isSection: true,
  });

  // Individual accounts
  for (const entry of entries) {
    items.push({
      ma: entry.ma,
      tenChiTieu: `${entry.ma} - ${entry.ten}`,
      dauNam: 0, // BE chưa trả dauNam, mặc định 0
      cuoiKy: entry.soTien,
      level: 1,
      doiTuongChiTiet: entry.doiTuongChiTiet,
    });
  }

  return items;
}

// ============ Service ============

class BalanceSheetServiceImpl extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  async getData(asOfDate?: string): Promise<BalanceSheetData> {
    const res = await this.get<BalanceSheetResponse>({
      endpoint: '/balance-sheet',
      params: { asOfDate: asOfDate || new Date().toISOString() },
    });

    const taiSanNganHan = res.taiSan.filter(a => a.ma.startsWith('1'));
    const taiSanDaiHan = res.taiSan.filter(a => a.ma.startsWith('2'));
    const noPhaiTra = res.nguonVon.filter(a => a.ma.startsWith('3'));
    const vonChuSoHuu = res.nguonVon.filter(a => a.ma.startsWith('4'));

    const taiSanItems = [
      ...mapEntriesToItems(taiSanNganHan, 'A - TÀI SẢN NGẮN HẠN', 'A'),
      ...mapEntriesToItems(taiSanDaiHan, 'B - TÀI SẢN DÀI HẠN', 'B'),
    ];

    const nguonVonItems = [
      ...mapEntriesToItems(noPhaiTra, 'C - NỢ PHẢI TRẢ', 'C'),
      ...mapEntriesToItems(vonChuSoHuu, 'D - VỐN CHỦ SỞ HỮU', 'D'),
    ];

    return {
      taiSan: taiSanItems,
      nguonVon: nguonVonItems,
      tongTaiSan: { dauNam: 0, cuoiKy: res.tongTaiSan },
      tongNguonVon: { dauNam: 0, cuoiKy: res.tongNguonVon },
      canDoi: Math.abs(res.tongTaiSan - res.tongNguonVon) < 1,
    };
  }

  async getStats(asOfDate?: string): Promise<BalanceSheetStats> {
    const res = await this.get<BalanceSheetResponse>({
      endpoint: '/balance-sheet',
      params: { asOfDate: asOfDate || new Date().toISOString() },
    });

    const taiSanNganHan = res.taiSan
      .filter(a => a.ma.startsWith('1'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const taiSanDaiHan = res.taiSan
      .filter(a => a.ma.startsWith('2'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const noPhaiTra = res.nguonVon
      .filter(a => a.ma.startsWith('3'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const vonChuSoHuu = res.nguonVon
      .filter(a => a.ma.startsWith('4'))
      .reduce((sum, e) => sum + e.soTien, 0);

    return {
      tongTaiSan: res.tongTaiSan,
      tongNguonVon: res.tongNguonVon,
      taiSanNganHan,
      taiSanDaiHan,
      noPhaiTra,
      vonChuSoHuu,
      tyLeNoTrenVon: vonChuSoHuu > 0 ? (noPhaiTra / vonChuSoHuu) * 100 : 0,
      tyLeTaiSanNganHan: res.tongTaiSan > 0 ? (taiSanNganHan / res.tongTaiSan) * 100 : 0,
      canDoi: Math.abs(res.tongTaiSan - res.tongNguonVon) < 1,
      ratios: res.ratios,
    };
  }
}

export const balanceSheetService = new BalanceSheetServiceImpl();
