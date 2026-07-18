import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { BalanceSheetData, BalanceSheetItem } from '@/services/balanceSheetService';

/**
 * Key cột lọc được của bảng — trùng `key` trong định nghĩa cột antd.
 * `chenhLech` là cột tính (không có field trong dữ liệu) → tính đúng công thức đang hiển thị.
 */
const getValue = (it: BalanceSheetItem, key: string): CellValue => {
  switch (key) {
    case 'tenChiTieu':
      return it.tenChiTieu;
    case 'ma':
      return it.ma;
    case 'dauNam':
      return it.dauNam;
    case 'cuoiKy':
      return it.cuoiKy;
    case 'chenhLech':
      return it.cuoiKy - it.dauNam;
    default:
      return undefined;
  }
};

const sum = (items: BalanceSheetItem[], pick: (i: BalanceSheetItem) => number): number =>
  items.reduce((s, i) => s + pick(i), 0);

/**
 * Lọc một nửa báo cáo (TÀI SẢN hoặc NGUỒN VỐN).
 *
 * Dòng nhóm (A/B/C/D) không bị đem đi so khớp: chỉ giữ lại nếu còn ít nhất 1 chỉ tiêu con khớp,
 * và số của nó được cộng lại theo đúng các con còn hiện. Nhóm không còn con nào thì bỏ hẳn để
 * bảng không dính dòng nhóm rỗng.
 */
function filterItems(items: BalanceSheetItem[], filters: ColumnFilters): BalanceSheetItem[] {
  const out: BalanceSheetItem[] = [];
  let section: BalanceSheetItem | null = null;
  let children: BalanceSheetItem[] = [];

  const flush = () => {
    if (!section || children.length === 0) return;
    out.push(
      {
        ...section,
        dauNam: sum(children, (i) => i.dauNam),
        cuoiKy: sum(children, (i) => i.cuoiKy),
      },
      ...children,
    );
  };

  for (const it of items) {
    if (it.isSection) {
      flush();
      section = it;
      children = [];
    } else if (matchAllFilters(it, filters, getValue)) {
      children.push(it);
    }
  }
  flush();

  return out;
}

/** Tổng của một nửa báo cáo = cộng các chỉ tiêu con (bỏ dòng nhóm, tránh cộng đúp). */
function totalOf(items: BalanceSheetItem[]): { dauNam: number; cuoiKy: number } {
  const leaves = items.filter((i) => !i.isSection);
  return {
    dauNam: sum(leaves, (i) => i.dauNam),
    cuoiKy: sum(leaves, (i) => i.cuoiKy),
  };
}

/**
 * Lọc bảng cân đối kế toán theo bộ lọc cột (chạy trên dữ liệu gốc, trước khi đưa vào bảng).
 * Không có bộ lọc nào → trả nguyên dữ liệu backend, tránh lệch do làm tròn.
 */
export function filterBangCanDoi(
  data: BalanceSheetData | null,
  filters: ColumnFilters,
): BalanceSheetData | null {
  if (!data || !hasActiveFilters(filters)) return data;

  const taiSan = filterItems(data.taiSan, filters);
  const nguonVon = filterItems(data.nguonVon, filters);
  const tongTaiSan = totalOf(taiSan);
  const tongNguonVon = totalOf(nguonVon);

  return {
    taiSan,
    nguonVon,
    tongTaiSan,
    tongNguonVon,
    canDoi: Math.abs(tongTaiSan.cuoiKy - tongNguonVon.cuoiKy) < 1,
  };
}
