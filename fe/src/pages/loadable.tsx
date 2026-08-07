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

export const CauHinhLuongPage = loadable(() => import('./luong/cau-hinh-luong/CauHinhLuongPage'), {
  fallback: <PageLoader />
});

export const BangLuongPage = loadable(() => import('./luong/bang-luong/BangLuongPage'), {
  fallback: <PageLoader />
});

export const BangThemGioPage = loadable(() => import('./luong/bang-luong-them-gio/BangThemGioPage'), {
  fallback: <PageLoader />
});

export const PhieuLuongCuaToiPage = loadable(() => import('./toi/phieu-luong/PhieuLuongCuaToi'), {
  fallback: <PageLoader />
});

export const QuyetToanTncnPage = loadable(() => import('./luong/quyet-toan-tncn/QuyetToanTncnPage'), {
  fallback: <PageLoader />
});

// Nhân sự
export const HoSoNhanVienPage = loadable(() => import('./nhan-su/ho-so-nhan-vien/HoSoNhanVienPage'), {
  fallback: <PageLoader />
});

export const HopDongLaoDongPage = loadable(() => import('./nhan-su/hop-dong-lao-dong/HopDongLaoDongPage'), {
  fallback: <PageLoader />
});

export const MauInHopDongPage = loadable(() => import('./nhan-su/mau-in-hop-dong/MauInHopDongPage'), {
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

export const QuyPhepPage = loadable(() => import('./cham-cong/quy-phep/QuyPhepPage'), {
  fallback: <PageLoader />
});

export const QuyGioPage = loadable(() => import('./cham-cong/quy-gio/QuyGioPage'), {
  fallback: <PageLoader />
});

export const ThietBiPage = loadable(() => import('./cham-cong/thiet-bi/ThietBiPage'), {
  fallback: <PageLoader />
});

export const BanGhiPage = loadable(() => import('./cham-cong/ban-ghi/BanGhiPage'), {
  fallback: <PageLoader />
});

export const CauHinhChamCongPage = loadable(() => import('./cham-cong/cau-hinh/CauHinhChamCongPage'), {
  fallback: <PageLoader />
});

export const ChamCongCuaToiPage = loadable(
  () => import('./cham-cong/cua-toi/ChamCongCuaToiPage'),
  { fallback: <PageLoader /> }
);

// Báo cáo
export const BaoCaoNhanSuPage = loadable(() => import('./bao-cao/nhan-su/BaoCaoNhanSuPage'), {
  fallback: <PageLoader />
});

// Vỏ nhân viên (/toi)
export const TaiKhoanPage = loadable(() => import('./toi/TaiKhoanPage'), {
  fallback: <PageLoader />
});

export const DangNhapChamCongPage = loadable(() => import('./toi/DangNhapChamCong'), {
  fallback: <PageLoader />
});

// Tab Bảng công trong vỏ /toi — lịch tháng kiểu iOS (P3.1). Giữ tên export
// `BangCongSapCoPage` để không phải đụng route ở App.tsx; component thật
// sự hiện là BangCongThang (chỗ tạm BangCongSapCo.tsx đã bị xoá).
export const BangCongSapCoPage = loadable(() => import('./toi/bang-cong/BangCongThang'), {
  fallback: <PageLoader />
});

// Đường nộp đơn DUY NHẤT của nhân viên thường: từ P3.6 Task 4, các route
// quản trị /don-cham-cong đòi quyền /cham-cong/don-tu:* mà nhân viên không có.
export const DonTuCuaToiPage = loadable(() => import('./toi/don-tu/DonTuCuaToiPage'), {
  fallback: <PageLoader />
});

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
