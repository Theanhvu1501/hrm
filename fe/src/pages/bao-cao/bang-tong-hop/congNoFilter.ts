import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type {
  BangTongHopCongNo,
  CongNoAccount,
  CongNoDoiTuongRow,
  CongNoRowVal,
} from '@/services/congNoTongHopService';

/** Cột số: giá trị lồng trong val — key trùng `key` trong định nghĩa cột antd. */
const NUM_PICKERS: Record<string, (v: CongNoRowVal) => number> = {
  'dk-pt': (v) => v.dauKy.phaiThu,
  'dk-ptr': (v) => v.dauKy.phaiTra,
  'ps-pt': (v) => v.phatSinh.phaiThu,
  'ps-ptr': (v) => v.phatSinh.phaiTra,
  'ck-pt': (v) => v.cuoiKy.phaiThu,
  'ck-ptr': (v) => v.cuoiKy.phaiTra,
};

/** Key cột lọc được của bảng — trùng `key` trong định nghĩa cột antd. */
const getValue = (dt: CongNoDoiTuongRow, key: string): CellValue => {
  if (key === 'ma') return dt.ma;
  if (key === 'ten') return dt.ten;
  const pick = NUM_PICKERS[key];
  return pick ? pick(dt) : undefined;
};

const ZERO: CongNoRowVal = {
  dauKy: { phaiThu: 0, phaiTra: 0 },
  phatSinh: { phaiThu: 0, phaiTra: 0 },
  cuoiKy: { phaiThu: 0, phaiTra: 0 },
};

/** Cộng dồn các dòng con thành số của dòng cha (dòng TK, dòng TỔNG CỘNG). */
function sumRows(rows: CongNoRowVal[]): CongNoRowVal {
  return rows.reduce<CongNoRowVal>(
    (acc, r) => ({
      dauKy: {
        phaiThu: acc.dauKy.phaiThu + r.dauKy.phaiThu,
        phaiTra: acc.dauKy.phaiTra + r.dauKy.phaiTra,
      },
      phatSinh: {
        phaiThu: acc.phatSinh.phaiThu + r.phatSinh.phaiThu,
        phaiTra: acc.phatSinh.phaiTra + r.phatSinh.phaiTra,
      },
      cuoiKy: {
        phaiThu: acc.cuoiKy.phaiThu + r.cuoiKy.phaiThu,
        phaiTra: acc.cuoiKy.phaiTra + r.cuoiKy.phaiTra,
      },
    }),
    ZERO,
  );
}

/**
 * Lọc báo cáo theo bộ lọc cột (chạy trên dữ liệu gốc, trước khi dàn phẳng).
 *
 * Giữ đối tượng khớp mọi bộ lọc đang bật; bỏ tài khoản không còn đối tượng nào; số của dòng TK
 * và TỔNG CỘNG được cộng lại từ các đối tượng còn lại (như AutoFilter + SUBTOTAL của Excel).
 * Không có bộ lọc nào → trả nguyên dữ liệu backend, tránh lệch do làm tròn.
 */
export function filterCongNo(
  data: BangTongHopCongNo | null,
  filters: ColumnFilters,
): BangTongHopCongNo | null {
  if (!data || !hasActiveFilters(filters)) return data;

  const accounts: CongNoAccount[] = [];
  for (const acc of data.accounts) {
    const doiTuongs = acc.doiTuongs.filter((dt) => matchAllFilters(dt, filters, getValue));
    if (doiTuongs.length === 0) continue;
    accounts.push({ ...acc, ...sumRows(doiTuongs), doiTuongs });
  }

  return { accounts, totals: sumRows(accounts) };
}
