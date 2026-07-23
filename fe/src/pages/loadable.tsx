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

export const QuaTrinhCongTacPage = loadable(() => import('./nhan-su/qua-trinh-cong-tac/QuaTrinhCongTacPage'), {
  fallback: <PageLoader />
});

export const ThoiViecPage = loadable(() => import('./nhan-su/thoi-viec/ThoiViecPage'), {
  fallback: <PageLoader />
});

// Chấm công
export const CaLamViecPage = loadable(() => import('./cham-cong/ca-lam-viec/CaLamViecPage'), {
  fallback: <PageLoader />
});

export const DiaDiemChamCongPage = loadable(() => import('./cham-cong/dia-diem-cham-cong/DiaDiemChamCongPage'), {
  fallback: <PageLoader />
});

export const DonChamCongPage = loadable(() => import('./cham-cong/don-cham-cong/DonChamCongPage'), {
  fallback: <PageLoader />
});

export const BangCongPage = loadable(() => import('./cham-cong/bang-cong/BangCongPage'), {
  fallback: <PageLoader />
});

export const NgayLePage = loadable(() => import('./cham-cong/ngay-le/NgayLePage'), {
  fallback: <PageLoader />
});

export const ThietBiPage = loadable(() => import('./cham-cong/thiet-bi/ThietBiPage'), {
  fallback: <PageLoader />
});

export const BanGhiPage = loadable(() => import('./cham-cong/ban-ghi/BanGhiPage'), {
  fallback: <PageLoader />
});

export const ChamCongCuaToiPage = loadable(
  () => import('./cham-cong/cua-toi/ChamCongCuaToiPage'),
  { fallback: <PageLoader /> }
);

// Other pages
export const TrangChuTheoQuyen = loadable(() => import('./TrangChuTheoQuyen'), {
  fallback: <PageLoader />
});

export const PlaceholderPage = loadable(() => import('./PlaceholderPage'), {
  fallback: <PageLoader />
});

export const ComingSoonPage = loadable(() => import('./ComingSoon'), {
  fallback: <PageLoader />
});

export const NotFound = loadable(() => import('./NotFound'), {
  fallback: <PageLoader />
});
