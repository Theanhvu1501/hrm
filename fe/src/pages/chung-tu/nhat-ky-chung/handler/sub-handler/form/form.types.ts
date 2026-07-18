import { DanhMuc } from "@/types";

export interface FormValues {
  loai: string;
  loaiTen?: string;
  ngay: { format: (f: string) => string };
  ngayGhiSo?: { format: (f: string) => string };
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  quyChuan?: string;
  doiTuongSnapshot?: DanhMuc["doiTuong"];
  doiTuong2Snapshot?: DanhMuc["doiTuong2"];
  duAnSnapshot?: DanhMuc["duAn"];
  boPhanSnapshot?: DanhMuc["boPhan"];
  doiSnapshot?: DanhMuc["doi"];
  nhanVienSnapshot?: DanhMuc["nhanVien"];
  sanPhamSnapshot?: DanhMuc["sanPham"];
  dongTienSnapshot?: DanhMuc["dongTien"];
  nhomKhuyenMaiSnapshot?: DanhMuc["nhomKhuyenMai"];
  nhomQuanLySnapshot?: DanhMuc["nhomQuanLy"];
  khoanMucSnapshot?: DanhMuc["khoanMuc"];
}

export interface SubmitData {
  loai: string;
  ngay: string;
  ngayGhiSo?: string;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
}

export interface InitFormResult {
  ngay: unknown;
  ngayGhiSo?: unknown;
  loai?: string;
  loaiTen?: string;
  soTien?: number;
  noiDung?: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  doiTuongId?: string;
  doiTuongSnapshot?: unknown;
  doiTuong2Id?: string;
  doiTuong2Snapshot?: unknown;
  duAnId?: string;
  duAnSnapshot?: unknown;
  chuDauTuMa?: string;
  chuDauTuTen?: string;
  boPhanId?: string;
  boPhanSnapshot?: unknown;
  doiId?: string;
  doiSnapshot?: unknown;
  nhanVienId?: string;
  nhanVienSnapshot?: unknown;
  sanPhamId?: string;
  sanPhamSnapshot?: unknown;
  dongTienId?: string;
  dongTienSnapshot?: unknown;
  nhomKhuyenMaiId?: string;
  nhomKhuyenMaiSnapshot?: unknown;
  nhomQuanLyId?: string;
  nhomQuanLySnapshot?: unknown;
  khoanMucId?: string;
  khoanMucSnapshot?: unknown;
}
