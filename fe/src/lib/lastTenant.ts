/** Nhớ công ty đã chọn gần nhất để hiện ở mục "Công ty đang làm việc" khi đăng nhập lại. */
const KEY = 'app.lastTenantId';

export function getLastTenantId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastTenantId(tenantId: string): void {
  try {
    localStorage.setItem(KEY, tenantId);
  } catch {
    /* localStorage bị chặn — bỏ qua, chỉ mất tiện ích ghi nhớ */
  }
}
