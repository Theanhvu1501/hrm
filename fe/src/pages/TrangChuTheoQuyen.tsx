import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { coQuyenQuanTri } from '@/config/coQuyenQuanTri';
import { TrangChuPage } from './loadable';

/**
 * Trang chủ chọn đích theo quyền thay vì redirect cứng.
 *
 * Trước đây route index đi thẳng /cau-hinh/vai-tro, nên nhân viên chưa được
 * HR gán vai trò đăng nhập lần đầu là gặp ngay màn "Không có quyền truy
 * cập" — trong khi việc duy nhất họ cần làm là bấm chấm công.
 *
 * Người có quyền quản trị thấy Trang chủ tổng quan ngay tại `/` (trước đây
 * bị chuyển thẳng sang /cau-hinh/vai-tro — một màn cấu hình, không phải
 * trang chủ). Trang tổng quan tự ẩn khối nào họ không có quyền xem.
 *
 * `isSuperAdmin` xét riêng cho khớp với `ProtectedRoute`, vốn cho superadmin
 * qua mọi cửa mà không cần khớp quyền nào.
 */
export default function TrangChuTheoQuyen() {
  const { user, hasPermission } = useAuth();
  const quanTri = Boolean(user?.isSuperAdmin) || coQuyenQuanTri(hasPermission);
  return quanTri ? <TrangChuPage /> : <Navigate to="/toi/cham-cong" replace />;
}
