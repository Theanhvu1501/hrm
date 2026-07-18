const IDENTITY_URL = import.meta.env.VITE_IDENTITY_URL as string | undefined;

/**
 * Redirect sang portal identity để đăng nhập tập trung.
 * Trả về true nếu đã redirect (có VITE_IDENTITY_URL).
 * Trả về false nếu VITE_IDENTITY_URL chưa cấu hình → giữ login cục bộ (fallback dev).
 */
export function redirectToIdentityLogin(): boolean {
  if (!IDENTITY_URL) return false;
  window.location.href = IDENTITY_URL;
  return true;
}
