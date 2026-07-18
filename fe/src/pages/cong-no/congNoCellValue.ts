import type { CellValue } from '@/components/table/columnFilter';

/**
 * Ô theo key cột cho bộ lọc ở header của 2 trang công nợ (phải thu / phải trả).
 * Kiểu khai báo theo cấu trúc (structural) để dùng chung cho cả `CongNoWithOverdue`,
 * `CongNoSummaryByCustomer` và `CongNoSummaryBySupplier`.
 */

export interface ChiTietRow {
  doiTuongId: string;
  /** Optional vì `CongNo.doiTuongTen` cũng optional. */
  doiTuongTen?: string;
  soTienGoc: number;
  /** Bảng phải trả cũng dùng field `daThu` (chỉ đổi nhãn cột thành "Đã trả"). */
  daThu: number;
  conLai: number;
}

interface TongHopBase {
  doiTuongId: string;
  doiTuongTen?: string;
  soHoaDon?: number;
  tongNo: number;
  conLai: number;
  quaHan?: number;
}

export type TongHopThuRow = TongHopBase & { daThu: number };
export type TongHopTraRow = TongHopBase & { daTra: number };

/** % đã thu/trả — đúng con số đang hiển thị trên thanh Progress. */
const percent = (paid: number, tongNo: number): number =>
  tongNo > 0 ? Math.round((paid / tongNo) * 100) : 0;

export const chiTietValue = (r: ChiTietRow, key: string): CellValue => {
  switch (key) {
    case 'doiTuongId':
      return r.doiTuongId;
    case 'doiTuongTen':
      return r.doiTuongTen;
    case 'soTienGoc':
      return r.soTienGoc;
    case 'daThu':
      return r.daThu;
    case 'conLai':
      return r.conLai;
    default:
      return undefined;
  }
};

const tongHopBaseValue = (r: TongHopBase, key: string): CellValue => {
  switch (key) {
    case 'doiTuongId':
      return r.doiTuongId;
    case 'doiTuongTen':
      return r.doiTuongTen;
    case 'soHoaDon':
      return r.soHoaDon;
    case 'tongNo':
      return r.tongNo;
    case 'conLai':
      return r.conLai;
    case 'quaHan':
      return r.quaHan;
    default:
      return undefined;
  }
};

export const tongHopThuValue = (r: TongHopThuRow, key: string): CellValue => {
  if (key === 'daThu') return r.daThu;
  if (key === 'tyLeThu') return percent(r.daThu, r.tongNo);
  return tongHopBaseValue(r, key);
};

export const tongHopTraValue = (r: TongHopTraRow, key: string): CellValue => {
  if (key === 'daTra') return r.daTra;
  if (key === 'tyLeTra') return percent(r.daTra, r.tongNo);
  return tongHopBaseValue(r, key);
};
