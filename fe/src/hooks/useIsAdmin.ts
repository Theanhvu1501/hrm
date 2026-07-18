import { useAuth } from '@/contexts/AuthContext';

/**
 * True nếu user là super admin hoặc admin tenant.
 * Vai trò là chuỗi tự do (vai_tro.ten) — dữ liệu thực tế dùng tên "Admin",
 * nên so sánh KHÔNG phân biệt hoa-thường.
 *
 * Lưu ý: API `user` không trả `vaiTro` (buildUserResponse bỏ qua), nên lấy
 * role theo công ty đang chọn từ `currentTenant.role`.
 * Dùng để gate các thao tác cấu hình chỉ dành cho quản trị (vd: Mẫu in, cấu hình dashboard).
 */
export function useIsAdmin(): boolean {
  const { user, currentTenant } = useAuth();
  if (user?.isSuperAdmin === true) return true;
  const role = user?.vaiTro ?? currentTenant?.role;
  return (role ?? '').toUpperCase() === 'ADMIN';
}
