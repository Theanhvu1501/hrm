import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { ManChoMasterCeo } from '@/components/common/ManChoMasterCeo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { user, isAuthenticated, isLoading, isLoggingOut, hasPermission } = useAuth();
  const location = useLocation();

  // Đang đăng xuất: trang sắp rời đi, giữ màn chờ. Để rơi xuống nhánh
  // !isAuthenticated bên dưới thì màn đăng nhập cục bộ loé lên trước khi trình
  // duyệt kịp sang portal — đúng lỗi "đăng xuất nháy hai lần".
  if (isLoggingOut) {
    return <ManChoMasterCeo chu="Đang đăng xuất…" />;
  }

  if (isLoading) {
    return <ManChoMasterCeo chu="Đang kiểm tra đăng nhập…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.isSuperAdmin) {
    return <>{children}</>;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle="Bạn không có quyền truy cập trang này."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Quay lại
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};
