import { readStringArray, writeStringArray, type StorageLike } from './tableStorage';

const STORAGE_PREFIX = 'tblpin:';

/** Các cột đang được ghim (cố định trái) của một bảng. Chưa lưu gì → mảng rỗng. */
export function readPinnedKeys(pageKey: string, storage?: StorageLike): string[] {
  return readStringArray(STORAGE_PREFIX, pageKey, storage) ?? [];
}

export function savePinnedKeys(pageKey: string, keys: string[], storage?: StorageLike): void {
  writeStringArray(STORAGE_PREFIX, pageKey, keys, storage);
}

/** Bật/tắt ghim 1 cột, giữ nguyên thứ tự các cột đã ghim trước đó. */
export function togglePinned(pinned: string[], key: string): string[] {
  return pinned.includes(key) ? pinned.filter((k) => k !== key) : [...pinned, key];
}
