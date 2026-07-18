import loadable from '@loadable/component';

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Auth
export const LoginPage = loadable(() => import('./auth/LoginPage'), {
  fallback: <PageLoader />
});

// Profile
export const ProfilePage = loadable(() => import('./profile/ProfilePage'), {
  fallback: <PageLoader />
});

// Cấu hình
export const PhanQuyenPage = loadable(() => import('./cau-hinh/phan-quyen/PhanQuyenPage'), {
  fallback: <PageLoader />
});

export const VaiTroPage = loadable(() => import('./cau-hinh/vai-tro/VaiTroPage'), {
  fallback: <PageLoader />
});

export const TenantPage = loadable(() => import('./cau-hinh/tenant/TenantPage'), {
  fallback: <PageLoader />
});

export const LinhVucPage = loadable(() => import('./cau-hinh/linh-vuc/LinhVucPage'), {
  fallback: <PageLoader />
});

export const ThanhVienPage = loadable(() => import('./cau-hinh/thanh-vien/ThanhVienPage'), {
  fallback: <PageLoader />
});

// Nhân sự
export const HoSoNhanVienPage = loadable(() => import('./nhan-su/ho-so-nhan-vien/HoSoNhanVienPage'), {
  fallback: <PageLoader />
});

export const HopDongLaoDongPage = loadable(() => import('./nhan-su/hop-dong-lao-dong/HopDongLaoDongPage'), {
  fallback: <PageLoader />
});

// Other pages
export const PlaceholderPage = loadable(() => import('./PlaceholderPage'), {
  fallback: <PageLoader />
});

export const ComingSoonPage = loadable(() => import('./ComingSoon'), {
  fallback: <PageLoader />
});

export const NotFound = loadable(() => import('./NotFound'), {
  fallback: <PageLoader />
});
