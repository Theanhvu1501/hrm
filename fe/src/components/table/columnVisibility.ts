import { readStringArray, writeStringArray, type StorageLike } from './tableStorage';

const STORAGE_PREFIX = 'tblcols:';

export type { StorageLike };

/**
 * Đọc lựa chọn cột đã lưu cho 1 bảng (theo pageKey).
 * - Trả `null` khi CHƯA có preference (hoặc dữ liệu hỏng) → caller hiểu là "hiện tất cả".
 *   Quan trọng với bảng dựng cột động: lúc đầu chưa có cột, không được mặc định ẩn hết.
 * - Trả mảng key (kể cả rỗng = người dùng cố ý ẩn hết) khi đã lưu hợp lệ.
 */
export function readSavedKeys(pageKey: string, storage?: StorageLike): string[] | null {
  return readStringArray(STORAGE_PREFIX, pageKey, storage);
}

export function saveVisibleKeys(pageKey: string, keys: string[], storage?: StorageLike): void {
  writeStringArray(STORAGE_PREFIX, pageKey, keys, storage);
}
