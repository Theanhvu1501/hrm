const IDENTITY_URL = import.meta.env.VITE_IDENTITY_URL as string | undefined;

/**
 * Đổi cookie phiên identity (mc_session, gửi kèm credentials) lấy access token
 * TƯƠI cho tenant. Đây là nguồn chân lý của phiên — KHÔNG tin token cache trong
 * localStorage.
 *
 * Trả về:
 * - accessToken mới nếu phiên identity còn sống.
 * - null nếu phiên đã kết thúc (đã logout ở portal → cookie/refresh chết → 401),
 *   identity chưa cấu hình, hoặc lỗi mạng. Caller coi null = "đã đăng xuất".
 */
export async function refreshFromIdentity(tenantId: string): Promise<string | null> {
  if (!IDENTITY_URL || !tenantId) return null;
  try {
    const res = await fetch(`${IDENTITY_URL}/api/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    });
    if (!res.ok) return null; // 401 = phiên identity đã kết thúc
    const body = await res.json().catch(() => null);
    return body?.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

/** Lấy tenantId từ claim của access token (khi chưa có tenant lưu sẵn). */
export function decodeTenantId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.tenantId ?? null;
  } catch {
    return null;
  }
}

/** Danh sách appId ĐƯỢC BẬT cho công ty hiện tại (claim `apps` trong token). */
export function decodeApps(token: string | null): string[] {
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Array.isArray(payload?.apps) ? (payload.apps as string[]) : [];
  } catch {
    return [];
  }
}

/** identity SSO có được cấu hình không (dev để trống → fallback login cục bộ). */
export function isIdentityConfigured(): boolean {
  return !!IDENTITY_URL;
}

// Phải khớp appId đã đăng ký ở Identity portal (app "Kế toán").
const APP_ID = 'nhan-su';

/** appId của app hiện tại (Kế toán). */
export const CURRENT_APP_ID = APP_ID;

export interface IdentityApp {
  appId: string;
  name: string;
  feUrl: string;
  iconUrl?: string;
}

/**
 * Danh sách app user được phép dùng (từ Identity), để "Chuyển ứng dụng".
 * [] nếu chưa cấu hình identity, chưa có token, hoặc lỗi.
 */
export async function identityApps(): Promise<IdentityApp[]> {
  if (!IDENTITY_URL) return [];
  const { getAuthToken } = await import('@/services/base/service-base');
  const token = getAuthToken();
  if (!token) return [];
  try {
    const res = await fetch(`${IDENTITY_URL}/api/me/apps`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) return [];
    const body = await res.json().catch(() => null);
    const list = (body?.data ?? []) as Array<{
      appId: string;
      name: string;
      feUrl: string;
      iconUrl?: string;
    }>;
    return list
      .filter((a) => a.feUrl)
      .map((a) => ({ appId: a.appId, name: a.name, feUrl: a.feUrl, iconUrl: a.iconUrl }));
  } catch {
    return [];
  }
}
