import { TenantChamCong } from '@/services/identitySession';

/**
 * Công ty chọn gần nhất Ở CỔNG CHẤM CÔNG. Cố ý tách khỏi `currentTenant` sẵn
 * có: cái kia là "công ty của phiên đang mở", còn cái này là thói quen của
 * người dùng ở đúng cánh cửa này và phải sống lâu hơn một phiên.
 */
export const KHOA_CONG_TY_DA_NHO = 'cham_cong_tenant_id';

export type KetQuaChonCongTy =
  | { loai: 'khong_co' }
  | { loai: 'da_chon'; tenantId: string }
  | { loai: 'phai_hoi'; danhSach: TenantChamCong[] };

/**
 * Chọn công ty sau khi đã có phiên. Hàm thuần để khoá bằng bảng — đây là chỗ
 * quyết định người dùng có phải bấm thêm một cú nào nữa không, tức là toàn bộ
 * lý do tồn tại của đợt này.
 */
export function chonCongTy(
  danhSach: TenantChamCong[],
  daNho: string | null
): KetQuaChonCongTy {
  if (danhSach.length === 0) return { loai: 'khong_co' };
  if (danhSach.length === 1) {
    return { loai: 'da_chon', tenantId: danhSach[0].tenantId };
  }
  // Đối chiếu lại với danh sách hiện tại: công ty đã nhớ có thể đã hết hiệu lực
  // (nghỉ việc, hoặc công ty bị gỡ quyền dùng app).
  if (daNho && danhSach.some((t) => t.tenantId === daNho)) {
    return { loai: 'da_chon', tenantId: daNho };
  }
  return { loai: 'phai_hoi', danhSach };
}

export function docCongTyDaNho(): string | null {
  try {
    return localStorage.getItem(KHOA_CONG_TY_DA_NHO);
  } catch {
    // Trình duyệt riêng tư / chặn lưu trữ: mất tính năng nhớ, không được vỡ.
    return null;
  }
}

export function ghiCongTyDaNho(tenantId: string): void {
  try {
    localStorage.setItem(KHOA_CONG_TY_DA_NHO, tenantId);
  } catch {
    /* xem chú thích ở docCongTyDaNho */
  }
}
