import { ImportColumn, ImportColumnKey, RawImportRow } from "./columns";

/** Chuẩn hóa tiêu đề để so khớp: trim, hạ hoa thường, bỏ dấu tiếng Việt, gộp khoảng trắng. */
function fold(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

/**
 * Vị trí thực tế của từng cột trong file, khớp theo TÊN tiêu đề (không theo vị trí).
 * Nhờ vậy file mẫu cũ (9 cột, chưa có Tiền thuế / Tổng thanh toán) và file mẫu mới (11 cột)
 * dùng chung một parser; cột xếp sai thứ tự cũng đọc đúng.
 */
export function buildHeaderMap(
  aoa: unknown[][],
  columns: ImportColumn[],
): Map<ImportColumnKey, number> {
  const header = (aoa?.[0] ?? []).map(fold);
  const map = new Map<ImportColumnKey, number>();
  for (const col of columns) {
    const idx = header.indexOf(fold(col.header));
    if (idx >= 0) map.set(col.key, idx);
  }
  return map;
}

/** Tên các cột BẮT BUỘC không tìm thấy trong header. Rỗng = file dùng được. */
export function missingRequiredColumns(
  aoa: unknown[][],
  columns: ImportColumn[],
): string[] {
  const map = buildHeaderMap(aoa, columns);
  return columns
    .filter((c) => c.required && !map.has(c.key))
    .map((c) => c.header);
}

/**
 * Chuyển array-of-arrays (đọc từ sheet) → RawImportRow[].
 * Dòng 0 là header (bỏ). Ô số giữ nguyên kiểu number (serial ngày, số tiền); còn lại ép về chuỗi
 * đã trim. Cột không có trong file → chuỗi rỗng. Bỏ qua dòng trống hoàn toàn.
 * rowNumber tính theo Excel (1-based, gồm header).
 */
export function aoaToRawRows(
  aoa: unknown[][],
  columns: ImportColumn[],
): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const headerMap = buildHeaderMap(aoa, columns);
  const rows: RawImportRow[] = [];

  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const values = cells.map((c) => {
      if (typeof c === "number") return c;
      return c === undefined || c === null ? "" : String(c).trim();
    });

    const isEmpty = values.every((v) => v === "");
    if (isEmpty) continue;

    const row: RawImportRow = { rowNumber: r + 1 };
    for (const col of columns) {
      const idx = headerMap.get(col.key);
      row[col.key] = idx === undefined ? "" : (values[idx] ?? "");
    }
    rows.push(row);
  }
  return rows;
}
