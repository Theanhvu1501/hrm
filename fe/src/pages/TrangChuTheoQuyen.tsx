import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { coQuyenQuanTri } from '@/config/coQuyenQuanTri';

/**
 * Trang chủ chọn đích theo quyền thay vì redirect cứng.
 *
 * Trước đây route index đi thẳng /cau-hinh/vai-tro, nên nhân viên chưa được
 * HR gán vai trò đăng nhập lần đầu là gặp ngay màn "Không có quyền truy
 * cập" — trong khi việc duy nhất họ cần làm là bấm chấm công.
 *
 * `isSuperAdmin` xét riêng cho khớp với `ProtectedRoute`, vốn cho superadmin
 * qua mọi cửa mà không cần khớp quyền nào.
 */
export default function TrangChuTheoQuyen() {
  const { user, hasPermission } = useAuth();
  const quanTri = Boolean(user?.isSuperAdmin) || coQuyenQuanTri(hasPermission);
  return <Navigate to={quanTri ? '/cau-hinh/vai-tro' : '/toi/cham-cong'} replace />;
}
