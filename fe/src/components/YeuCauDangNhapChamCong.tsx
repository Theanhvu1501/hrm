import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Guard cho nhánh `/toi`: chưa đăng nhập thì về `/toi/login`.
 *
 * CỐ Ý không dùng `ProtectedRoute`: nó đá sang `/login`, từ đó bật tiếp sang
 * Portal — và cổng chấm công sẽ không bao giờ được nhìn thấy. Cũng CỐ Ý không
 * thêm nhánh rẽ vào `ProtectedRoute`: nó đang phục vụ toàn bộ khu quản trị,
 * nhét một quyết định của vỏ nhân viên vào đó là làm hỏng chỗ dùng chung.
 *
 * Không kiểm quyền: mọi nhân viên đăng nhập đều phải chấm công được ngay ngày
 * đầu đi làm, trước khi HR kịp gán vai trò — cùng lý do đã ghi ở
 * `routePermissions.ts`.
 */
export function YeuCauDangNhapChamCong({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Phải chờ khôi phục phiên xong mới quyết. Chuyển hướng sớm sẽ ném người
  // đang đăng nhập hợp lệ về màn nhập mật khẩu mỗi lần tải lại trang.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/toi/login" replace />;

  return <>{children}</>;
}
