/**
 * Silent re-auth: khi request bị 401, thử refresh access token đúng MỘT lần
 * qua phiên identity rồi replay request gốc. Tách thành hàm thuần + inject
 * dependency để test được, và để interceptor axios chỉ còn phần nối dây mỏng.
 */

export interface RetryableConfig {
  _retry?: boolean;
  [key: string]: unknown;
}

export interface ReauthDeps<R> {
  /** tenantId hiện tại (từ tenant đang chọn hoặc claim của token). */
  resolveTenantId: () => string | null;
  /** đổi cookie phiên identity lấy access token tươi; null nếu phiên đã chết. */
  refresh: (tenantId: string) => Promise<string | null>;
  /** lưu access token mới cho các request sau. */
  setToken: (token: string) => void;
  /** phát lại request gốc với token mới. */
  replay: (config: RetryableConfig) => Promise<R>;
  /** hết đường cứu: xoá token + báo AuthContext để logout/redirect. */
  onGiveUp: () => void;
}

export async function retryRequestOnce<R>(
  config: RetryableConfig | undefined,
  deps: ReauthDeps<R>,
): Promise<R> {
  // đã retry rồi (hoặc không có config để replay) → không lặp vô hạn
  if (!config || config._retry) {
    deps.onGiveUp();
    throw new Error('reauth: không thể retry request');
  }
  const tenantId = deps.resolveTenantId();
  if (!tenantId) {
    deps.onGiveUp();
    throw new Error('reauth: thiếu tenantId');
  }
  const fresh = await deps.refresh(tenantId);
  if (!fresh) {
    deps.onGiveUp();
    throw new Error('reauth: phiên identity đã kết thúc');
  }
  deps.setToken(fresh);
  config._retry = true;
  return deps.replay(config);
}
