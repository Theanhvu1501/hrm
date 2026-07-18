/** Toán tử lọc cho cột chữ. */
export type TextOp = 'contains' | 'notContains' | 'equals' | 'startsWith';

/** Toán tử lọc cho cột số (kiểu AutoFilter của Excel). */
export type NumberOp = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'blank' | 'notBlank';

export interface TextFilter {
  kind: 'text';
  op: TextOp;
  value: string;
}

export interface NumberFilter {
  kind: 'number';
  op: NumberOp;
  /** Giá trị người dùng gõ, giữ nguyên chuỗi; parse khi so khớp. */
  value: string;
}

export type ColumnFilter = TextFilter | NumberFilter;
export type FilterKind = ColumnFilter['kind'];

/** Ô đưa vào so khớp: cột chữ trả chuỗi, cột số trả số. */
export type CellValue = string | number | null | undefined;

/** Bộ lọc đang áp trên bảng: key cột → điều kiện. */
export type ColumnFilters = Record<string, ColumnFilter | undefined>;

export const TEXT_OPS: { value: TextOp; label: string }[] = [
  { value: 'contains', label: 'Chứa' },
  { value: 'notContains', label: 'Không chứa' },
  { value: 'equals', label: 'Bằng' },
  { value: 'startsWith', label: 'Bắt đầu bằng' },
];

export const NUMBER_OPS: { value: NumberOp; label: string }[] = [
  { value: 'eq', label: 'Bằng' },
  { value: 'ne', label: 'Khác' },
  { value: 'lt', label: 'Nhỏ hơn' },
  { value: 'lte', label: 'Nhỏ hơn hoặc bằng' },
  { value: 'gt', label: 'Lớn hơn' },
  { value: 'gte', label: 'Lớn hơn hoặc bằng' },
  { value: 'blank', label: '(Trống)' },
  { value: 'notBlank', label: '(Không trống)' },
];

export const DEFAULT_TEXT_OP: TextOp = 'contains';
export const DEFAULT_NUMBER_OP: NumberOp = 'eq';

/** Toán tử số không cần ô nhập giá trị. */
export function isValuelessOp(op: NumberOp): boolean {
  return op === 'blank' || op === 'notBlank';
}

/** Hạ hoa thường + bỏ dấu tiếng Việt để so khớp "cong ty" ↔ "CÔNG TY". */
function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

const VN_GROUPED = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/; // 1.230.000 | 1.230.000,75
const EN_GROUPED = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/; // 1,230,000 | 1,230,000.75
const COMMA_DECIMAL = /^-?\d+(,\d+)?$/; //            1500,5
const DOT_DECIMAL = /^-?\d+(\.\d+)?$/; //             1230000 | 1500.5

/**
 * Đọc số người dùng gõ vào ô lọc. Chấp nhận cả kiểu VN (1.230.000) lẫn kiểu thuần (1230000),
 * số âm và số lẻ. Không đọc được → null (coi như chưa lọc).
 */
export function parseFilterNumber(input: string): number | null {
  const s = input.replace(/\s/g, '');
  if (s === '') return null;

  let normalized: string;
  if (VN_GROUPED.test(s)) normalized = s.replace(/\./g, '').replace(',', '.');
  else if (EN_GROUPED.test(s)) normalized = s.replace(/,/g, '');
  else if (COMMA_DECIMAL.test(s)) normalized = s.replace(',', '.');
  else if (DOT_DECIMAL.test(s)) normalized = s;
  else return null;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Đọc số của ô dữ liệu. Ô rỗng/không phải số → null. */
function cellNumber(raw: CellValue): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Sai số khi so bằng: tránh lệch do cộng dồn số thực (nửa xu). */
const EPS = 0.005;

/** Có phải bộ lọc đang thực sự áp không. */
export function isActiveFilter(filter: ColumnFilter | undefined): boolean {
  if (!filter) return false;
  if (filter.kind === 'number') {
    return isValuelessOp(filter.op) || parseFilterNumber(filter.value) !== null;
  }
  return filter.value.trim() !== '';
}

/**
 * Một ô chữ có khớp điều kiện lọc không. Bộ lọc rỗng → khớp mọi dòng.
 * Ô nguồn rỗng chỉ khớp "Không chứa" (giống Excel: ô trống không chứa gì cả).
 */
export function matchText(raw: CellValue, filter: TextFilter): boolean {
  if (!isActiveFilter(filter)) return true;

  const needle = fold(filter.value);
  const hay = fold(String(raw ?? ''));

  switch (filter.op) {
    case 'contains':
      return hay.includes(needle);
    case 'notContains':
      return !hay.includes(needle);
    case 'equals':
      return hay === needle;
    case 'startsWith':
      return hay.startsWith(needle);
    default:
      return true;
  }
}

/**
 * Một ô số có khớp điều kiện lọc không.
 * - (Trống) = ô không có số HOẶC bằng 0 (trên bảng kế toán, 0 hiện thành ô trắng/dấu "-").
 * - Toán tử so sánh: ô không có số thì không khớp (như Excel); ô bằng 0 vẫn là số 0.
 */
export function matchNumber(raw: CellValue, filter: NumberFilter): boolean {
  const cell = cellNumber(raw);

  if (filter.op === 'blank') return cell === null || cell === 0;
  if (filter.op === 'notBlank') return cell !== null && cell !== 0;

  const target = parseFilterNumber(filter.value);
  if (target === null) return true; // chưa nhập / nhập sai → không lọc
  if (cell === null) return false;

  switch (filter.op) {
    case 'eq':
      return Math.abs(cell - target) <= EPS;
    case 'ne':
      return Math.abs(cell - target) > EPS;
    case 'lt':
      return cell < target - EPS;
    case 'lte':
      return cell <= target + EPS;
    case 'gt':
      return cell > target + EPS;
    case 'gte':
      return cell >= target - EPS;
    default:
      return true;
  }
}

/** Dòng có khớp TẤT CẢ bộ lọc đang bật không. `getValue` lấy ô theo key cột. */
export function matchAllFilters<T>(
  row: T,
  filters: ColumnFilters,
  getValue: (row: T, key: string) => CellValue,
): boolean {
  for (const [key, filter] of Object.entries(filters)) {
    if (!filter || !isActiveFilter(filter)) continue;
    const cell = getValue(row, key);
    const ok = filter.kind === 'number' ? matchNumber(cell, filter) : matchText(cell, filter);
    if (!ok) return false;
  }
  return true;
}

/** Có bộ lọc nào đang bật không. */
export function hasActiveFilters(filters: ColumnFilters): boolean {
  return Object.values(filters).some(isActiveFilter);
}
