import {
  hasActiveFilters,
  matchAllFilters,
  type ColumnFilters,
} from '@/components/table/columnFilter';

/** Phần dòng mà bộ lọc cột quan tâm (RowDef của trang thỏa mãn shape này). */
export interface TndnFilterRow {
  kind: string;
  label: string;
  note?: string;
}

/** Key cột lọc được — trùng `key` trong định nghĩa cột antd. */
const getValue = (row: TndnFilterRow, key: string): string | undefined =>
  key === 'label' ? row.label : key === 'note' ? row.note : undefined;

/**
 * Lọc các dòng của báo cáo TNDN theo bộ lọc cột.
 *
 * Bảng có dòng tiêu đề nhóm (`kind: 'section'`) — chỉ là dải phân cách, không mang số liệu.
 * Dòng nhóm KHÔNG bị đem đi so khớp; nó chỉ còn hiển thị khi trong nhóm còn ít nhất một dòng
 * dữ liệu sống sót (giống Excel: ẩn hết dòng con thì không để lại cái tiêu đề trơ trọi).
 *
 * Các dòng "Tổng chi phí ghi nhận" / A / B / thuế... là dòng CALC do backend tính trên toàn kỳ,
 * không phải tổng cộng của những dòng đang hiển thị → lọc chỉ ẩn/hiện chúng, không tính lại.
 */
export function filterTndnRows<T extends TndnFilterRow>(
  rows: T[],
  filters: ColumnFilters,
): T[] {
  if (!hasActiveFilters(filters)) return rows;

  const out: T[] = [];
  let pendingSection: T | null = null;

  for (const row of rows) {
    if (row.kind === 'section') {
      pendingSection = row;
      continue;
    }
    if (!matchAllFilters(row, filters, getValue)) continue;
    if (pendingSection) {
      out.push(pendingSection);
      pendingSection = null;
    }
    out.push(row);
  }

  return out;
}
