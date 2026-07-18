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

// Dashboard
export const Dashboard = loadable(() => import('./dashboard/Dashboard'), {
  fallback: <PageLoader />
});

// Profile
export const ProfilePage = loadable(() => import('./profile/ProfilePage'), {
  fallback: <PageLoader />
});

// Danh mục
export const TaiKhoanPage = loadable(() => import('./danh-muc/tai-khoan/TaiKhoanPage'), {
  fallback: <PageLoader />
});

export const DoiTuongPage = loadable(() => import('./danh-muc/doi-tuong/DoiTuongPage'), {
  fallback: <PageLoader />
});

export const SanPhamPage = loadable(() => import('./danh-muc/san-pham/SanPhamPage'), {
  fallback: <PageLoader />
});

export const DuAnPage = loadable(() => import('./danh-muc/du-an/DuAnPage'), {
  fallback: <PageLoader />
});

export const BoPhanPage = loadable(() => import('./danh-muc/bo-phan/BoPhanPage'), {
  fallback: <PageLoader />
});

export const KhoanMucPage = loadable(() => import('./danh-muc/khoan-muc/KhoanMucPage'), {
  fallback: <PageLoader />
});

export const SoDuDauKyPage = loadable(() => import('./danh-muc/so-du-dau-ky/SoDuDauKyPage'), {
  fallback: <PageLoader />
});

export const NganHangPage = loadable(() => import('./danh-muc/ngan-hang/NganHangPage'), {
  fallback: <PageLoader />
});

export const DongTienPage = loadable(() => import('./danh-muc/dong-tien/DongTienPage'), {
  fallback: <PageLoader />
});

export const ChuDauTuPage = loadable(() => import('./danh-muc/chu-dau-tu/ChuDauTuPage'), {
  fallback: <PageLoader />
});

export const NhomKhuyenMaiPage = loadable(() => import('./danh-muc/nhom-khuyen-mai/NhomKhuyenMaiPage'), {
  fallback: <PageLoader />
});

export const NhomQuanLyPage = loadable(() => import('./danh-muc/nhom-quan-ly/NhomQuanLyPage'), {
  fallback: <PageLoader />
});

export const LoaiChungTuPage = loadable(() => import('./danh-muc/loai-chung-tu/LoaiChungTuPage'), {
  fallback: <PageLoader />
});

export const NhomKhoanMucPage = loadable(() => import('./danh-muc/nhom-khoan-muc/NhomKhoanMucPage'), {
  fallback: <PageLoader />
});

export const LoaiGiaoDichPage = loadable(() => import('./danh-muc/loai-giao-dich/LoaiGiaoDichPage'), {
  fallback: <PageLoader />
});

export const HopDongPage = loadable(() => import('./danh-muc/hop-dong/HopDongPage'), {
  fallback: <PageLoader />
});

export const KhoPage = loadable(() => import('./danh-muc/kho/KhoPage'), {
  fallback: <PageLoader />
});

export const DonViTinhPage = loadable(() => import('./danh-muc/don-vi-tinh/DonViTinhPage'), {
  fallback: <PageLoader />
});

export const LyDoKhongHopLePage = loadable(() => import('./danh-muc/ly-do-khong-hop-le/LyDoKhongHopLePage'), {
  fallback: <PageLoader />
});

export const NhomVatTuPage = loadable(() => import('./danh-muc/nhom-vat-tu/NhomVatTuPage'), {
  fallback: <PageLoader />
});

export const HangHoaVatTuPage = loadable(() => import('./danh-muc/hang-hoa-vat-tu/HangHoaVatTuPage'), {
  fallback: <PageLoader />
});

// Bếp ăn
export const DinhMucTienAnPage = loadable(() => import('./bep-an/dinh-muc-tien-an/DinhMucTienAnPage'), {
  fallback: <PageLoader />
});

export const CongThucDinhLuongPage = loadable(() => import('./bep-an/cong-thuc-dinh-luong/CongThucDinhLuongPage'), {
  fallback: <PageLoader />
});

export const DiemDanhAnPage = loadable(() => import('./bep-an/diem-danh-an/DiemDanhAnPage'), {
  fallback: <PageLoader />
});

export const DeXuatMuaPage = loadable(() => import('./bep-an/de-xuat-mua/DeXuatMuaPage'), {
  fallback: <PageLoader />
});

export const KiemSoatChiPhiPage = loadable(() => import('./bep-an/kiem-soat-chi-phi/KiemSoatChiPhiPage'), {
  fallback: <PageLoader />
});

// Kho
export const NhapKhoPage = loadable(() => import('./kho/nhap-kho/NhapKhoPage'), {
  fallback: <PageLoader />
});

export const XuatKhoPage = loadable(() => import('./kho/xuat-kho/XuatKhoPage'), {
  fallback: <PageLoader />
});

export const ChuyenKhoPage = loadable(() => import('./kho/chuyen-kho/ChuyenKhoPage'), {
  fallback: <PageLoader />
});

// Chứng từ
export const PhieuThuPage = loadable(() => import('./chung-tu/phieu-thu/PhieuThuPage'), {
  fallback: <PageLoader />
});

export const PhieuChiPage = loadable(() => import('./chung-tu/phieu-chi/PhieuChiPage'), {
  fallback: <PageLoader />
});

export const NhatKyChungPage = loadable(() => import('./chung-tu/nhat-ky-chung/NhatKyChungPage'), {
  fallback: <PageLoader />
});

export const NhatKyChungFormPage = loadable(() => import('./chung-tu/nhat-ky-chung/NhatKyChungFormPage'), {
  fallback: <PageLoader />
});

// Sổ quỹ
export const SoQuyPage = loadable(() => import('./so-quy/SoQuyPage'), {
  fallback: <PageLoader />
});

// Công nợ
export const CongNoPhaiThuPage = loadable(() => import('./cong-no/phai-thu/CongNoPhaiThuPage'), {
  fallback: <PageLoader />
});

export const CongNoPhaiTraPage = loadable(() => import('./cong-no/phai-tra/CongNoPhaiTraPage'), {
  fallback: <PageLoader />
});

// Báo cáo
export const PnLPage = loadable(() => import('./bao-cao/pnl/PnLPage'), {
  fallback: <PageLoader />
});

export const SoCaiPage = loadable(() => import('./bao-cao/so-cai/SoCaiPage'), {
  fallback: <PageLoader />
});

export const SoChiTietTaiKhoanPage = loadable(() => import('./bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage'), {
  fallback: <PageLoader />
});

export const BangCanDoiPage = loadable(() => import('./bao-cao/bang-can-doi/BangCanDoiPage'), {
  fallback: <PageLoader />
});

export const BangTongHopCongNoPage = loadable(() => import('./bao-cao/bang-tong-hop/BangTongHopCongNoPage'), {
  fallback: <PageLoader />
});

export const BaoCaoTaiChinhPage = loadable(() => import('./bao-cao/tai-chinh/BaoCaoTaiChinhPage'), {
  fallback: <PageLoader />
});

export const KqkdPage = loadable(() => import('./bao-cao/kqkd/KqkdPage'), {
  fallback: <PageLoader />
});

// Thư viện tài liệu
export const BieuMauPage = loadable(() => import('./thu-vien/BieuMauPage'), {
  fallback: <PageLoader />
});

export const ChinhSachPage = loadable(() => import('./thu-vien/ChinhSachPage'), {
  fallback: <PageLoader />
});

export const HuongDanPage = loadable(() => import('./thu-vien/HuongDanPage'), {
  fallback: <PageLoader />
});

// Cấu hình
export const QuyChaunPage = loadable(() => import('./danh-muc/quy-chuan/QuyChaunPage'), {
  fallback: <PageLoader />
});

export const HoSoChungTuPage = loadable(() => import('./danh-muc/ho-so-chung-tu/HoSoChungTuPage'), {
  fallback: <PageLoader />
});

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

export const SaoChepDanhMucPage = loadable(() => import('./cau-hinh/sao-chep-danh-muc/SaoChepDanhMucPage'), {
  fallback: <PageLoader />
});

export const ThanhVienPage = loadable(() => import('./cau-hinh/thanh-vien/ThanhVienPage'), {
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

export const QuanLyHopDongPage = loadable(() => import('./trung-tam-du-lieu/hop-dong/QuanLyHopDongPage'), {
  fallback: <PageLoader />
});

export const BaoCaoHopDongPage = loadable(() => import('./bao-cao/hop-dong/BaoCaoHopDongPage'), {
  fallback: <PageLoader />
});

export const SoThuTienPage = loadable(() => import('./trung-tam-du-lieu/thu-tien/SoThuTienPage'), {
  fallback: <PageLoader />
});

export const SoHoaDonBanRaPage = loadable(() => import('./trung-tam-du-lieu/hd-ban-ra/SoHoaDonBanRaPage'), {
  fallback: <PageLoader />
});

// Thuế
export const BangKeMuaVaoPage = loadable(() => import('./thue/bang-ke-mua-vao/BangKeMuaVaoPage'), {
  fallback: <PageLoader />
});

export const BangKeBanRaPage = loadable(() => import('./thue/bang-ke-ban-ra/BangKeBanRaPage'), {
  fallback: <PageLoader />
});

export const TongHopThuePage = loadable(() => import('./thue/tong-hop/TongHopThuePage'), {
  fallback: <PageLoader />
});

export const BaoCaoTNDNPage = loadable(() => import('./thue/bao-cao-tndn/BaoCaoTNDNPage'), {
  fallback: <PageLoader />
});
