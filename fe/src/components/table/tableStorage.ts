// Khoá lưu công ty hiện tại (service-base/setCurrentTenant). Đọc trực tiếp từ
// cùng storage để module này không phụ thuộc service-base mà vẫn test được.
const TENANT_STORAGE_KEY = 'current_tenant';
// Scope dùng khi chưa chọn công ty (vd chưa đăng nhập) — tách khỏi data theo cty.
const NO_TENANT_SCOPE = '_';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const browserStorage = (): StorageLike | undefined =>
  typeof localStorage !== 'undefined' ? localStorage : undefined;

/** ID công ty đang chọn, lấy từ chính storage (key `current_tenant`). */
const currentTenantScope = (storage: StorageLike | undefined): string => {
  if (!storage) return NO_TENANT_SCOPE;
  try {
    const raw = storage.getItem(TENANT_STORAGE_KEY);
    if (!raw) return NO_TENANT_SCOPE;
    const tenantId = (JSON.parse(raw) as { tenantId?: unknown } | null)?.tenantId;
    return typeof tenantId === 'string' && tenantId !== '' ? tenantId : NO_TENANT_SCOPE;
  } catch {
    return NO_TENANT_SCOPE;
  }
};

/**
 * Khoá lưu preference của một bảng, tách theo công ty:
 * `{prefix}{tenantId}:{pageKey}` → mỗi công ty một bộ cài đặt riêng.
 */
export const tableStorageKey = (
  prefix: string,
  pageKey: string,
  storage: StorageLike | undefined,
): string => `${prefix}${currentTenantScope(storage)}:${pageKey}`;

/** Đọc mảng chuỗi đã lưu; `null` khi chưa có hoặc dữ liệu hỏng. */
export function readStringArray(
  prefix: string,
  pageKey: string,
  storage: StorageLike | undefined = browserStorage(),
): string[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(tableStorageKey(prefix, pageKey, storage));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((k) => typeof k !== 'string')) {
      return null;
    }
    return parsed as string[];
  } catch {
    return null;
  }
}

export function writeStringArray(
  prefix: string,
  pageKey: string,
  keys: string[],
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(tableStorageKey(prefix, pageKey, storage), JSON.stringify(keys));
  } catch {
    /* ignore quota / private mode */
  }
}
