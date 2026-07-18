import { ChungTu, NhatKyChung } from '@/types';

/**
 * Get display value from snapshot or fallback to legacy field
 * These helpers ensure backward compatibility with existing data
 */

// ===== ChungTu Display Helpers =====

export const getDoiTuongTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.doiTuongSnapshot?.ten ?? chungTu.doiTuongTen;
};

export const getDoiTuong2Ten = (chungTu: ChungTu): string | undefined => {
  return chungTu.doiTuong2Snapshot?.ten ?? chungTu.doiTuong2Ten;
};

export const getDuAnTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.duAnSnapshot?.ten ?? chungTu.duAnTen;
};

export const getChuDauTuTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.duAnSnapshot?.chuDauTuTen ?? chungTu.chuDauTuTen;
};

export const getBoPhanTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.boPhanSnapshot?.ten ?? chungTu.boPhanTen;
};

export const getDoiTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.doiSnapshot?.ten ?? chungTu.doiTen;
};

export const getNhanVienTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.nhanVienSnapshot?.ten ?? chungTu.nhanVienTen;
};

export const getSanPhamTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.sanPhamSnapshot?.ten ?? chungTu.sanPhamTen;
};

export const getDongTienTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.dongTienSnapshot?.ten ?? chungTu.dongTienTen;
};

export const getKhoanMucTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.khoanMucSnapshot?.ten ?? chungTu.khoanMucTen;
};

export const getTaiKhoanNoTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.taiKhoanNoSnapshot?.ten;
};

export const getTaiKhoanCoTen = (chungTu: ChungTu): string | undefined => {
  return chungTu.taiKhoanCoSnapshot?.ten;
};


// ===== NhatKyChung Display Helpers =====
// Updated to use new danhMuc structure

// Đối tượng
export const getNkcDoiTuongMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.doiTuong?.ma;
};

export const getNkcDoiTuongTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.doiTuong?.ten ?? nkc.doiTuong;
};

// Đối tượng 2
export const getNkcDoiTuong2Ma = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.doiTuong2?.ma;
};

export const getNkcDoiTuong2Ten = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.doiTuong2?.ten ?? nkc.doiTuong2;
};

// Dự án
export const getNkcDuAnMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.duAn?.ma;
};

export const getNkcDuAnTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.duAn?.ten ?? nkc.duAn;
};

// Chủ đầu tư
export const getNkcChuDauTuMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.duAn?.chuDauTuMa;
};

export const getNkcChuDauTuTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.duAn?.chuDauTuTen ?? nkc.chuDauTu;
};

// Bộ phận
export const getNkcBoPhanMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.boPhan?.ma;
};

export const getNkcBoPhanTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.boPhan?.ten ?? nkc.boPhan;
};

// Đội
export const getNkcDoiMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.doi?.ma;
};

export const getNkcDoiTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.doi?.ten ?? nkc.doi;
};

// Nhân viên
export const getNkcNhanVienMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nhanVien?.ma;
};

export const getNkcNhanVienTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nhanVien?.ten ?? nkc.nhanVien;
};

// Sản phẩm
export const getNkcSanPhamMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.sanPham?.ma;
};

export const getNkcSanPhamTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.sanPham?.ten ?? nkc.sanPham;
};

// Dòng tiền
export const getNkcDongTienMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.dongTien?.ma;
};

export const getNkcDongTienTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.dongTien?.ten ?? nkc.dongTien;
};

// Tài khoản
export const getNkcTaiKhoanNoTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.taiKhoanNo?.ten;
};

export const getNkcTaiKhoanCoTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.taiKhoanCo?.ten;
};

// Khoản mục
export const getNkcKhoanMucMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.khoanMuc?.ma;
};

export const getNkcKhoanMucTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.khoanMuc?.ten;
};

// Nhóm khuyến mại
export const getNkcNhomKhuyenMaiMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nhomKhuyenMai?.ma;
};

export const getNkcNhomKhuyenMaiTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nhomKhuyenMai?.ten;
};

// Nhóm quản lý
export const getNkcNhomQuanLyMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nhomQuanLy?.ma;
};

export const getNkcNhomQuanLyTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nhomQuanLy?.ten;
};

// Nghiệp vụ
export const getNkcNghiepVuMa = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nghiepVu?.ma;
};

export const getNkcNghiepVuTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.nghiepVu?.ten;
};

// Hợp đồng
export const getNkcHopDongSo = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.hopDong?.soHopDong;
};

export const getNkcHopDongTen = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.hopDong?.tenCongTrinh;
};

export const getNkcHopDongGiaTri = (nkc: NhatKyChung): number | undefined => {
  return nkc.danhMuc?.hopDong?.giaTriSauThue;
};

export const getNkcHopDongNgayKy = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.hopDong?.ngayKy;
};

export const getNkcHopDongTrangThai = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.hopDong?.trangThai;
};

export const getNkcHopDongNguoiKy = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.hopDong?.nguoiKy;
};

export const getNkcHopDongChuDauTu = (nkc: NhatKyChung): string | undefined => {
  return nkc.danhMuc?.hopDong?.chuDauTuTen;
};
