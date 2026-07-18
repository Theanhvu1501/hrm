import type { ColumnsType, ColumnType } from 'antd/es/table';
import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { FilterableOptions } from '@/components/table/useTableColumnFilters';
import type { SoChiTietReport, SoChiTietRow } from '@/services/soChiTietTaiKhoanService';
import { REGISTRY, type DisplayRow } from './columnRegistry';

/** Cột ngày: chưa hỗ trợ lọc. */
const DATE_KEYS = new Set(['ngay', 'ngayChungTu']);

/** Cột số: lọc bằng toán tử số. Tiêu đề cột chỉ là "Nợ"/"Có" nên cần nhãn riêng cho popover. */
const NUMBER_TITLES: Record<string, string> = {
  phatSinhNo: 'Phát sinh Nợ',
  phatSinhCo: 'Phát sinh Có',
  soDuNo: 'Số dư Nợ',
  soDuCo: 'Số dư Có',
};

const isNumberKey = (key: string): boolean => key in NUMBER_TITLES;

/** Cột có gắn popover lọc ở header (mọi cột trừ cột ngày). */
export function isFilterableKey(key: string): boolean {
  return !DATE_KEYS.has(key);
}

const DATA_INDEX = new Map(REGISTRY.map((c) => [c.key, c.dataIndex]));
const DEF_BY_DATA_INDEX = new Map(REGISTRY.map((c) => [c.dataIndex, c]));

type Filterable = <T>(
  col: ColumnType<T> & { key: string; title: string },
  opts?: FilterableOptions,
) => ColumnType<T>;

/**
 * Gắn popover lọc + cố định cột vào các cột của bảng antd (đi xuống cả cột con của header gộp
 * như "Chứng từ", "Số phát sinh"). Cột được nhận diện qua `dataIndex` vì `buildAntdColumns`
 * không đặt `key`.
 */
export function withColumnFilters(
  columns: ColumnsType<DisplayRow>,
  filterable: Filterable,
): ColumnsType<DisplayRow> {
  return columns.map((col) => {
    if ('children' in col && col.children) {
      return { ...col, children: withColumnFilters(col.children, filterable) };
    }
    const leaf = col as ColumnType<DisplayRow>;
    const def = DEF_BY_DATA_INDEX.get(String(leaf.dataIndex));
    if (!def || !isFilterableKey(def.key)) return col;
    return filterable<DisplayRow>(
      { ...leaf, key: def.key, title: def.title },
      isNumberKey(def.key)
        ? { type: 'number', filterTitle: NUMBER_TITLES[def.key] }
        : undefined,
    );
  });
}

/** Lấy ô của dòng phát sinh theo key cột (key trùng dataIndex trong REGISTRY). */
function getValue(row: SoChiTietRow, key: string): CellValue {
  const dataIndex = DATA_INDEX.get(key);
  if (!dataIndex) return undefined;
  const v = (row as unknown as Record<string, unknown>)[dataIndex];
  if (isNumberKey(key)) return typeof v === 'number' ? v : undefined;
  return typeof v === 'string' ? v : undefined;
}

/**
 * Tính lại phần tổng của một tài khoản theo các dòng phát sinh CÒN HIỆN:
 * - Cộng số phát sinh = tổng Nợ/Có của các dòng còn lại.
 * - Số dư cuối kỳ = số dư đầu kỳ + phát sinh còn lại (giữ đẳng thức đầu kỳ + phát sinh = cuối kỳ
 *   đúng với cái đang xem trên màn hình).
 * Số dư luỹ kế trên từng dòng giữ nguyên của backend (như AutoFilter của Excel: ô không đổi,
 * chỉ dòng bị ẩn).
 */
function recalc(report: SoChiTietReport, rows: SoChiTietRow[]): SoChiTietReport {
  let tongPhatSinhNo = 0;
  let tongPhatSinhCo = 0;
  for (const r of rows) {
    tongPhatSinhNo += r.phatSinhNo || 0;
    tongPhatSinhCo += r.phatSinhCo || 0;
  }
  const du =
    (report.soDuDauKyNo || 0) -
    (report.soDuDauKyCo || 0) +
    tongPhatSinhNo -
    tongPhatSinhCo;

  return {
    ...report,
    rows,
    tongPhatSinhNo,
    tongPhatSinhCo,
    soDuCuoiKyNo: du > 0 ? du : 0,
    soDuCuoiKyCo: du < 0 ? -du : 0,
  };
}

/**
 * Lọc sổ chi tiết theo bộ lọc cột — chạy trên dữ liệu gốc, trước khi dàn phẳng thành dòng
 * đầu kỳ / phát sinh / cộng / cuối kỳ.
 *
 * Tài khoản không còn dòng phát sinh nào khớp thì bỏ luôn bảng của tài khoản đó (không hiện
 * bảng chỉ có mấy dòng tổng). Không có bộ lọc nào → trả nguyên dữ liệu backend.
 */
export function filterSoChiTietReports(
  reports: SoChiTietReport[] | null,
  filters: ColumnFilters,
): SoChiTietReport[] | null {
  if (!reports || !hasActiveFilters(filters)) return reports;

  const out: SoChiTietReport[] = [];
  for (const report of reports) {
    const rows = report.rows.filter((r) => matchAllFilters(r, filters, getValue));
    if (rows.length === 0) continue;
    out.push(recalc(report, rows));
  }
  return out;
}
