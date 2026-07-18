import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { SoCaiByAccount, SoCaiEntry, TrialBalance } from '@/services/soCaiService';

/** Cột số của bảng tài khoản (tab Tổng hợp theo TK và tab Cân đối phát sinh). */
const ACCOUNT_NUM_KEYS = new Set([
  'soDuDauKyNo',
  'soDuDauKyCo',
  'phatSinhNo',
  'phatSinhCo',
  'soDuCuoiKyNo',
  'soDuCuoiKyCo',
]);

/** Key cột lọc được của bảng tài khoản (tab Tổng hợp theo TK và tab Cân đối phát sinh). */
const accountValue = (r: SoCaiByAccount | TrialBalance, key: string): CellValue => {
  if (key === 'taiKhoan') return r.taiKhoan;
  if (key === 'tenTaiKhoan') return r.tenTaiKhoan;
  if (ACCOUNT_NUM_KEYS.has(key)) return (r as unknown as Record<string, number>)[key];
  return undefined;
};

/** Cột số của bảng bút toán (tab Chi tiết tài khoản). */
const ENTRY_NUM_KEYS = new Set(['phatSinhNo', 'phatSinhCo', 'soDuNo', 'soDuCo']);

/** Key cột lọc được của bảng bút toán (tab Chi tiết tài khoản). */
const entryValue = (e: SoCaiEntry, key: string): CellValue => {
  if (key === 'soPhieu') return e.soPhieu;
  if (key === 'loaiChungTu') return e.loaiChungTu;
  if (key === 'dienGiai') return e.dienGiai;
  if (ENTRY_NUM_KEYS.has(key)) return (e as unknown as Record<string, number>)[key];
  return undefined;
};

/**
 * Tab "Tổng hợp theo TK". Bảng phẳng — dòng Tổng cộng của antd cộng lại từ dataSource, nên chỉ
 * cần lọc là số tổng tự khớp với những dòng còn hiện.
 */
export function filterSoCaiSummary(
  rows: SoCaiByAccount[],
  filters: ColumnFilters,
): SoCaiByAccount[] {
  if (!hasActiveFilters(filters)) return rows;
  return rows.filter((r) => matchAllFilters(r, filters, accountValue));
}

/** Tab "Bảng cân đối phát sinh". Cũng phẳng, cùng bộ key cột với bảng tổng hợp. */
export function filterTrialBalance(rows: TrialBalance[], filters: ColumnFilters): TrialBalance[] {
  if (!hasActiveFilters(filters)) return rows;
  return rows.filter((r) => matchAllFilters(r, filters, accountValue));
}

/**
 * Tab "Chi tiết tài khoản": lọc bút toán rồi CỘNG LẠI phát sinh Nợ/Có theo các dòng còn hiện
 * (như SUBTOTAL của Excel) để khối tổng phía trên bảng không lệch với bảng.
 *
 * Số dư đầu kỳ / cuối kỳ giữ nguyên: đó là số dư của tài khoản, không phải tổng của mấy dòng
 * đang hiển thị.
 */
export function filterSoCaiChiTiet(
  acc: SoCaiByAccount | null,
  filters: ColumnFilters,
): SoCaiByAccount | null {
  if (!acc || !hasActiveFilters(filters)) return acc;

  const chiTiet = acc.chiTiet.filter((e) => matchAllFilters(e, filters, entryValue));
  return {
    ...acc,
    phatSinhNo: chiTiet.reduce((s, e) => s + e.phatSinhNo, 0),
    phatSinhCo: chiTiet.reduce((s, e) => s + e.phatSinhCo, 0),
    chiTiet,
  };
}
