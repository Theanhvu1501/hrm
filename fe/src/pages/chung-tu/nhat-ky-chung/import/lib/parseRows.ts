import { DATE_COLUMN_KEYS, DateColumnKey, IMPORT_COLUMNS, RawImportRow } from "./columns";

const isDateColumn = (key: string): key is DateColumnKey =>
  (DATE_COLUMN_KEYS as readonly string[]).includes(key);

/**
 * Chuyển array-of-arrays (đọc từ sheet) → RawImportRow[].
 * Dòng 0 là header (bỏ). Map theo VỊ TRÍ cột (index), không theo tên.
 * Cột ngày giữ nguyên serial number để normalizeDate đọc; cột khác ép về chuỗi đã trim.
 * Bỏ qua dòng trống hoàn toàn. rowNumber tính theo Excel (1-based, gồm header).
 */
export function aoaToRawRows(aoa: unknown[][]): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const rows: RawImportRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const isEmpty = cells.every((c) => c === undefined || c === null || String(c).trim() === "");
    if (isEmpty) continue;

    const row: RawImportRow = { rowNumber: r + 1 };
    IMPORT_COLUMNS.forEach((col, i) => {
      const cell = cells[i];
      if (isDateColumn(col.key) && typeof cell === "number") {
        row[col.key] = cell;
      } else {
        row[col.key] = cell === undefined || cell === null ? "" : String(cell).trim();
      }
    });
    rows.push(row);
  }
  return rows;
}
