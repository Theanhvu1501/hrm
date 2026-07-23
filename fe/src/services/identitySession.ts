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

/** Công ty dạng rút gọn cho cổng chấm công — chỉ cần đủ để chọn và hiển thị. */
export interface TenantChamCong {
  tenantId: string;
  tenantName: string;
}

export type KetQuaDangNhap = 'ok' | 'sai_thong_tin' | 'loi_mang';

/**
 * Đăng nhập thẳng vào identity từ trình duyệt.
 *
 * hrm CỐ Ý không đứng giữa: mật khẩu đi từ trình duyệt sang identity, backend
 * hrm không bao giờ thấy nó. Cookie `mc_session` identity đặt nằm ở domain
 * `.masterceo.com.vn` nên đây là CÙNG một phiên với Portal — không phải
 * identity thứ hai, chỉ là cửa trước thứ hai.
 *
 * Trả mã thay vì ném, theo đúng lối `refreshFromIdentity` ở trên: màn hình cần
 * phân biệt "sai mật khẩu" với "mất mạng" để nói đúng việc phải làm tiếp, và
 * `try/catch` rải khắp component thì không ai đọc được.
 */
export async function identityLogin(
  email: string,
  matKhau: string
): Promise<KetQuaDangNhap> {
  if (!IDENTITY_URL) return 'loi_mang';
  try {
    const res = await fetch(`${IDENTITY_URL}/api/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: matKhau }),
    });
    if (res.ok) return 'ok';
    // CHỈ 401 mới là sai thông tin. 500 mà báo "sai mật khẩu" sẽ khiến người
    // dùng gõ lại đúng mật khẩu mười lần rồi gọi HR.
    return res.status === 401 ? 'sai_thong_tin' : 'loi_mang';
  } catch {
    return 'loi_mang';
  }
}

/**
 * Danh sách công ty mà tài khoản hiện tại dùng được app này.
 *
 * `GET /api/me/tenants` của identity dùng `SessionOrBearerGuard` nên CHỈ cookie
 * là đủ — không cần access token. Đó là thứ cho phép cổng chấm công biết
 * "phiên còn sống không" TRƯỚC khi hỏi mật khẩu.
 *
 * `null` và `[]` là hai chuyện khác nhau và không được gộp:
 * - `null` = không có phiên (401) hoặc không gọi được → phải hiện ô mật khẩu.
 * - `[]`   = có phiên, nhưng tài khoản không được cấp app này → phải báo lỗi
 *            và liên hệ HR; hỏi mật khẩu ở đây là dẫn người dùng đi vòng vô ích.
 */
export async function identityTenants(): Promise<TenantChamCong[] | null> {
  if (!IDENTITY_URL) return null;
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/me/tenants?app=${encodeURIComponent(APP_ID)}`,
      { credentials: 'include' }
    );
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    const list = (body?.data ?? []) as Array<{ tenantId: string; tenantName: string }>;
    return list.map((t) => ({ tenantId: t.tenantId, tenantName: t.tenantName }));
  } catch {
    return null;
  }
}

/**
 * Đóng phiên identity của CHÍNH thiết bị này.
 *
 * Không có bước này thì "Đăng xuất" chỉ xoá token cục bộ, còn cookie
 * `mc_session` vẫn sống — mở lại masterceo.com.vn là vào thẳng, không phải
 * nhập mật khẩu. Trên máy cá nhân dùng để chấm công, đăng xuất phải có nghĩa
 * là đăng xuất.
 *
 * Endpoint này chỉ đóng phiên của đúng cookie đó (xem chú thích ở
 * `identity-service/src/auth/auth.controller.ts`), nên không đá người dùng ra
 * khỏi máy tính để bàn của họ.
 *
 * Nuốt mọi lỗi: người dùng đã bấm đăng xuất rồi, phần dọn phiên cục bộ và
 * điều hướng phải chạy tiếp dù identity có trả lời hay không.
 */
export async function identityLogout(): Promise<void> {
  if (!IDENTITY_URL) return;
  try {
    await fetch(`${IDENTITY_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    /* bỏ qua — xem chú thích trên */
  }
}
