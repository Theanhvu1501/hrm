import { RowValidationResult } from "./columns";

/**
 * Khóa nhận diện hóa đơn trùng: số HĐ + ký hiệu + MST đối tác.
 * Phải khớp `buildHoaDonKey` của tax-service (be/apps/tax-service/src/shared/tax-helpers.ts).
 */
export function buildHoaDonKey(
  soHoaDon?: string,
  kyHieuHoaDon?: string,
  mst?: string,
): string {
  return [soHoaDon, kyHieuHoaDon, mst]
    .map((s) => (s ?? "").trim().toUpperCase())
    .join("|");
}

/** Các khóa xuất hiện từ 2 lần trở lên trong cùng file. */
export function findDuplicateKeysInFile(keys: string[]): Set<string> {
  const count = new Map<string, number>();
  for (const k of keys) count.set(k, (count.get(k) ?? 0) + 1);
  return new Set([...count].filter(([, n]) => n > 1).map(([k]) => k));
}

/**
 * Gắn cảnh báo trùng vào kết quả validate. Không sinh lỗi — hóa đơn trùng
 * vẫn import được, chỉ tô vàng ở bảng xem trước.
 */
export function applyDuplicateWarnings(
  results: RowValidationResult[],
  existingKeys: string[],
): RowValidationResult[] {
  const existing = new Set(existingKeys);
  const inFile = findDuplicateKeysInFile(
    results.filter((r) => r.key).map((r) => r.key),
  );

  return results.map((r) => {
    if (!r.key) return r;
    const warnings = [...r.warnings];
    if (existing.has(r.key)) {
      warnings.push({
        field: "soHoaDon",
        message: "Hóa đơn đã tồn tại trên hệ thống",
      });
    }
    if (inFile.has(r.key)) {
      warnings.push({
        field: "soHoaDon",
        message: "Trùng với dòng khác trong cùng file",
      });
    }
    return warnings.length === r.warnings.length ? r : { ...r, warnings };
  });
}
