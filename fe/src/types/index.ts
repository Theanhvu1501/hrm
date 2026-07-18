// ===== DANH MỤC KHO =====

export type TinhChatVatTu = 'TAI_SAN' | 'HANG_HOA' | 'NGUYEN_LIEU';
export interface Kho { id: string; ma: string; ten: string; diaChi?: string; thuKho?: string; moTa?: string; isActive?: boolean; }
export interface DonViTinh { id: string; ma: string; ten: string; moTa?: string; isActive?: boolean; }
export interface NhomVatTu { id: string; ma: string; ten: string; moTa?: string; isActive?: boolean; }
export interface HangHoaVatTu {
  id: string; ma: string; ten: string; tinhChat?: TinhChatVatTu;
  donViTinhMa?: string; donViTinhTen?: string; nhomVatTuMa?: string; nhomVatTuTen?: string;
  quyCach?: string; tkKho?: string; donGia?: number; moTa?: string; isActive?: boolean;
}

// ===== DANH MỤC =====

export interface TaiKhoan {
  id: string;
  ma: string;
  ten: string;
  capDo: number;
  loai: 'TAI_SAN' | 'NO_PHAI_TRA' | 'VON_CHU_SO_HUU' | 'DOANH_THU' | 'CHI_PHI' | 'THU_NHAP_KHAC' | 'CHI_PHI_KHAC' | 'XAC_DINH_KQKD';
  nhom: 'NO' | 'CO' | 'LUONG_TINH' | 'KHONG_CO_SO_DU';
  parentId?: string;
  moTa?: string;
  chiTietTheo?: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU' | 'NGAN_HANG_QUY';
  fieldRules?: Partial<Record<
    'doiTuong' | 'duAn' | 'boPhan' | 'doi' | 'nhanVien' | 'sanPham' | 'dongTien' | 'khoanMuc',
    'BAT_BUOC' | 'CANH_BAO'
  >> | null;
}

export interface DoiTuong {
  id: string;
  loai: ('KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU')[];
  ma: string;
  ten: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
  nguoiLienHe?: string;
}

export interface DuAn {
  id: string;
  ma: string;
  ten: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  chuDuAnMa?: string;
  chuDuAn?: string;
  chuDauTuId?: string;
  trangThai: 'DANG_THUC_HIEN' | 'HOAN_THANH' | 'TAM_DUNG';
}

export interface SanPham {
  id: string;
  ma: string;
  ten: string;
  donVi?: string;
  giaBan?: number;
  nhom?: string;
  moTa?: string;
}

export interface BoPhan {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

export interface KhoanMuc {
  id: string;
  ma: string;
  ten: string;
  loai: 'CHI_PHI' | 'DOANH_THU';
  nhom: string;
}

export interface TaiKhoanNganHang {
  id: string;
  ma: string;
  ten: string;
  loai: 'TIEN_MAT' | 'NGAN_HANG';
  soDu: number;
  nganHang?: string;
  soTaiKhoan?: string;
  chiNhanh?: string;
  chuTaiKhoan?: string;
  trangThai?: boolean;
}

export interface DongTien {
  id: string;
  ma: string;
  ten: string;
  loai: 'KINH_DOANH' | 'DAU_TU' | 'TAI_CHINH';
  moTa?: string;
}

export interface ChuDauTu {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

export interface NhomKhuyenMai {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

export interface NhomQuanLy {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

// ===== HỢP ĐỒNG =====

export enum TrangThaiHopDong {
  CHUA_CO_HD = 'CHUA_CO_HD',
  HD_CHUA_KY = 'HD_CHUA_KY',
  HD_PHOTO_SCAN = 'HD_PHOTO_SCAN',
  HD_GOC = 'HD_GOC',
}

export interface PhuLuc {
  giaTri?: number;
  ngayKy?: string;
}

export interface DieuKhoanThanhToan {
  tamUng?: number;
  thanhToanGiaiDoan?: number;
  quyetToan?: number;
}

export interface BaoHanh {
  giaTri?: number;
  thoiGian?: string;
  hinhThuc?: string;
}

export interface TienDoThiCong {
  soNgay?: number;
  tuNgay?: string;
  denNgay?: string;
}

export interface HopDong {
  id: string;
  soHopDong: string;
  tenCongTrinh: string;
  nam?: number;
  giaTriSauThue?: number;
  ngayKy?: string;
  phuLuc1?: PhuLuc;
  phuLuc2?: PhuLuc;
  doiTuongId?: string;
  nguoiKy?: string;
  chucVu?: string;
  nguoiGiaoDich?: string;
  dieuKhoanThanhToan?: DieuKhoanThanhToan;
  baoHanh?: BaoHanh;
  tienDoThiCong?: TienDoThiCong;
  trangThai?: TrangThaiHopDong;
  soLuongLuu?: number;
}

export interface LoaiGiaoDich {
  id: string;
  ma: string;
  ten: string;
  color?: string;
  moTa?: string;
  // Mã Loại chứng từ liên kết — quyết định phiếu thu/chi/NKC khi tạo chứng từ
  loaiChungTuMa?: string;
}

// ===== THEO DÕI HỢP ĐỒNG (Phần 2) =====
export interface QuyetToanHD {
  so?: string;
  ngay?: string;
  giaTri?: number;
}
export interface BaoHanhTheoDoi {
  giaTri?: number;
  soNgay?: number;
  ngayGiaiToaBL?: string;
  trangThai?: string;
}
export interface DotThanhToan {
  tiLe?: number;
  soTien?: number;
}
export interface DotHoaDon {
  soTien?: number;
}
export interface TinhTrangHoSo {
  hd?: boolean;
  nt1?: boolean;
  nt2?: boolean;
  ntSuDung?: boolean;
  thanhLy?: boolean;
  namQuyetToan?: number;
}
export interface TheoDoiHopDong {
  id?: string;
  hopDongId: string;
  phuTrachHoSo?: string;
  trangThaiHoSo?: string;
  quyetToan?: QuyetToanHD;
  baoHanhTheoDoi?: BaoHanhTheoDoi;
  giamTru?: number;
  dotThanhToan?: DotThanhToan[];
  dotHoaDon?: DotHoaDon[];
  tinhTrangHoSo?: TinhTrangHoSo;
  ghiChu?: string;
}
export interface ThuTienHopDong {
  id?: string;
  nam?: number;
  hopDongId: string;
  soHopDong?: string;
  doiTuongId?: string;
  tenKhachHang?: string;
  noiDung?: string;
  soTien: number;
  ngay?: string;
  lan?: number;
  ghiChu?: string;
}
export interface HoaDonBanRa {
  id?: string;
  soHoaDon?: string;
  ngay?: string;
  noiDung?: string;
  hopDongId: string;
  soHopDong?: string;
  tenCongTrinh?: string;
  doiTuongId?: string;
  donViMua?: string;
  tienHang?: number;
  tienThue?: number;
  tong: number;
  lan?: number;
  nam?: number;
  namHoaDon?: number;
}
export interface BaoCaoHopDongRow {
  nam: number | null;
  soLuong: number;
  giaTri: number;
  quyetToan: number;
  thuTien: number;
  chuaCoHD: number;
  hdChuaKy: number;
  hdPhotoScan: number;
  hdGoc: number;
  giaTriBinhQuan: number;
}
export interface TheoDoiHopDongRow {
  hopDongId: string;
  soHopDong: string;
  tenCongTrinh: string;
  nam?: number;
  giaTriSauThue?: number;
  ngayKy?: string;
  doiTuongId?: string;
  trangThaiHopDong?: TrangThaiHopDong;
  tracking: TheoDoiHopDong | null;
  daThanhToan: number;
  daTraHoaDon: number;
  conLai: number;
}

// ===== DANH MỤC DTO (New Backend Structure) =====

export type LoaiChungTu = 'PHIEU_THU' | 'PHIEU_CHI';

// DanhMuc nested types (matching backend DTO)
export interface DanhMucDoiTuong {
  ma: string;
  ten: string;
  loai: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
}

export interface DanhMucDuAn {
  ma: string;
  ten: string;
  trangThai: string;
  chuDauTuMa?: string;
  chuDauTuTen?: string;
}

export interface DanhMucBoPhan {
  ma: string;
  ten: string;
}

export interface DanhMucDoi {
  ma: string;
  ten: string;
}

export interface DanhMucNhanVien {
  ma: string;
  ten: string;
}

export interface DanhMucTaiKhoan {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

export interface DanhMucKhoanMuc {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

export interface DanhMucSanPham {
  ma: string;
  ten: string;
  donVi?: string;
  giaBan?: number;
}

export interface DanhMucDongTien {
  ma: string;
  ten: string;
  loai: string;
}

export interface DanhMucLoaiGiaoDich {
  ma: string;
  ten: string;
}

export interface DanhMucLoaiChungTu {
  ma: string;
  ten: string;
}

export interface DanhMucChuDauTu {
  ma: string;
  ten: string;
}

export interface DanhMucNhomKhuyenMai {
  ma: string;
  ten: string;
}

export interface DanhMucNhomQuanLy {
  ma: string;
  ten: string;
}

export interface DanhMucNghiepVu {
  ma: string;
  ten: string;
}

export interface DanhMucHopDong {
  ma: string;
  ten: string;
  soHopDong: string;
  tenCongTrinh: string;
  giaTriSauThue?: number;
  ngayKy?: string;
  phuLuc1GiaTri?: number;
  phuLuc1NgayKy?: string;
  phuLuc2GiaTri?: number;
  phuLuc2NgayKy?: string;
  chuDauTuTen?: string;
  nguoiKy?: string;
  chucVu?: string;
  nguoiGiaoDich?: string;
  tamUng?: string;
  thanhToanGiaiDoan?: string;
  quyetToan?: string;
  baoHanhGiaTri?: number;
  baoHanhThoiGian?: string;
  baoHanhHinhThuc?: string;
  tienDoSoNgay?: number;
  tienDoTuNgay?: string;
  tienDoDenNgay?: string;
  trangThai?: TrangThaiHopDong;
  soLuongLuu?: number;
}

// Main DanhMuc interface containing all category references
export interface DanhMuc {
  doiTuong?: DanhMucDoiTuong;
  doiTuong2?: DanhMucDoiTuong;
  duAn?: DanhMucDuAn;
  boPhan?: DanhMucBoPhan;
  doi?: DanhMucDoi;
  nhanVien?: DanhMucNhanVien;
  taiKhoanNo?: DanhMucTaiKhoan;
  taiKhoanCo?: DanhMucTaiKhoan;
  khoanMuc?: DanhMucKhoanMuc;
  sanPham?: DanhMucSanPham;
  dongTien?: DanhMucDongTien;
  loaiGiaoDich?: DanhMucLoaiGiaoDich;
  loaiChungTu?: DanhMucLoaiChungTu;
  chuDauTu?: DanhMucChuDauTu;
  nhomKhuyenMai?: DanhMucNhomKhuyenMai;
  nhomQuanLy?: DanhMucNhomQuanLy;
  nghiepVu?: DanhMucNghiepVu;
  hopDong?: DanhMucHopDong;
}

// Backend response type for ChungTu (taiKhoanNo/taiKhoanCo now inside danhMuc)
export interface ChungTuResponse {
  _id: string;
  soPhieu: string;
  loai: LoaiChungTu;
  ngay: string | Date;
  ngayGhiSo?: string | Date;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  nguoiTaoId: string;
  ngayTao: string | Date;
  danhMuc?: DanhMuc;
  hoSoChungTu?: HoSoChungTuItem[];
  kiemSoat?: KiemSoatChungTu;
}

// ===== SNAPSHOT INTERFACES (Legacy - kept for backward compatibility) =====

export interface DoiTuongSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU' | 'NGAN_HANG_QUY';
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
  // Số tài khoản ngân hàng (khi đối tượng là tài khoản ngân hàng/quỹ)
  soTaiKhoan?: string;
}

export interface DuAnSnapshot {
  id: string;
  ma: string;
  ten: string;
  trangThai: 'DANG_THUC_HIEN' | 'HOAN_THANH' | 'TAM_DUNG';
  chuDauTuId?: string;
  chuDauTuMa?: string;
  chuDauTuTen?: string;
}

export interface BoPhanSnapshot {
  id: string;
  ma: string;
  ten: string;
}

export interface DoiSnapshot {
  id: string;
  ma: string;
  ten: string;
}

export interface NhanVienSnapshot {
  id: string;
  ma: string;
  ten: string;
}

export interface TaiKhoanSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'TAI_SAN' | 'NO_PHAI_TRA' | 'VON_CHU_SO_HUU' | 'DOANH_THU' | 'CHI_PHI' | 'THU_NHAP_KHAC' | 'CHI_PHI_KHAC' | 'XAC_DINH_KQKD';
  nhom: 'NO' | 'CO' | 'LUONG_TINH' | 'KHONG_CO_SO_DU';
}

export interface KhoanMucSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'CHI_PHI' | 'DOANH_THU';
  nhom: string;
}

export interface SanPhamSnapshot {
  id: string;
  ma: string;
  ten: string;
  donVi?: string;
  giaBan?: number;
}

export interface DongTienSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'KINH_DOANH' | 'DAU_TU' | 'TAI_CHINH';
}

export interface HopDongSnapshot {
  id: string;
  soHopDong: string;
  tenCongTrinh: string;
  giaTriSauThue?: number;
  ngayKy?: string;
  phuLuc1GiaTri?: number;
  phuLuc1NgayKy?: string;
  phuLuc2GiaTri?: number;
  phuLuc2NgayKy?: string;
  chuDauTuTen?: string;
  nguoiKy?: string;
  chucVu?: string;
  nguoiGiaoDich?: string;
  tamUng?: string;
  thanhToanGiaiDoan?: string;
  quyetToan?: string;
  baoHanhGiaTri?: number;
  baoHanhThoiGian?: string;
  baoHanhHinhThuc?: string;
  tienDoSoNgay?: number;
  tienDoTuNgay?: string;
  tienDoDenNgay?: string;
  trangThai?: TrangThaiHopDong;
  soLuongLuu?: number;
}

// ===== CHỨNG TỪ =====

export interface ChungTu {
  id: string;
  soPhieu: string;
  loai: 'PHIEU_THU' | 'PHIEU_CHI';
  ngay: string;
  soTien: number;
  noiDung: string;

  // Legacy ID references (for backward compatibility)
  doiTuongId?: string;
  doiTuong2Id?: string;
  duAnId?: string;
  chuDauTuId?: string;
  boPhanId?: string;
  doiId?: string;
  nhanVienId?: string;
  sanPhamId?: string;
  dongTienId?: string;
  khoanMucId?: string;
  taiKhoanNo: string;
  taiKhoanCo: string;

  // Legacy name fields (for backward compatibility)
  doiTuongTen?: string;
  doiTuong2Ten?: string;
  duAnTen?: string;
  chuDauTuTen?: string;
  boPhanTen?: string;
  doiTen?: string;
  nhanVienTen?: string;
  sanPhamTen?: string;
  dongTienTen?: string;
  khoanMucTen?: string;

  // Snapshot fields
  doiTuongSnapshot?: DoiTuongSnapshot;
  doiTuong2Snapshot?: DoiTuongSnapshot;
  duAnSnapshot?: DuAnSnapshot;
  boPhanSnapshot?: BoPhanSnapshot;
  doiSnapshot?: DoiSnapshot;
  nhanVienSnapshot?: NhanVienSnapshot;
  taiKhoanNoSnapshot?: TaiKhoanSnapshot;
  taiKhoanCoSnapshot?: TaiKhoanSnapshot;
  khoanMucSnapshot?: KhoanMucSnapshot;
  sanPhamSnapshot?: SanPhamSnapshot;
  dongTienSnapshot?: DongTienSnapshot;

  // New nested danhMuc field (returned by backend)
  danhMuc?: DanhMuc;

  nguoiGiaoDich?: string;
  diaChi?: string;
  trangThai: 'NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  nguoiTao: string;
  ngayTao: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  ghiChu?: string;
}

export interface NhatKyChung {
  id: string;
  ngay: string;
  ngayGhiSo?: string;
  soPhieu: string;
  loaiChungTu: string;
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;

  // Display fields extracted from danhMuc
  doiTuong?: string;
  doiTuong2?: string;
  duAn?: string;
  chuDauTu?: string;
  boPhan?: string;
  doi?: string;
  nhanVien?: string;
  sanPham?: string;
  dongTien?: string;

  // Full danhMuc object for detailed views
  danhMuc?: DanhMuc;

  // Kiểm soát hồ sơ hạch toán
  hoSoChungTu?: HoSoChungTuItem[];
  kiemSoat?: KiemSoatChungTu;
}

// ===== SỔ QUỸ =====

export interface SoQuy {
  id: string;
  ngay: string;
  soPhieu: string;
  dienGiai?: string;
  noiDung?: string;
  thu: number;
  chi: number;
  tonSau?: number;
  soDu?: number;
}

// ===== CÔNG NỢ =====

export interface CongNo {
  id?: string;
  _id?: string;
  loai: 'PHAI_THU' | 'PHAI_TRA';
  doiTuongId: string;
  doiTuongTen?: string;
  soTienGoc: number;
  daThu: number;
  conLai: number;
  ngayPhatSinh?: string;
  hanThanhToan?: string;
  trangThai: 'CHUA_THU' | 'DA_THU_MOT_PHAN' | 'DA_THU_DU';
}

// ===== QUY CHUẨN HẠCH TOÁN =====

export interface HoSoChungTuRef { id: string; ma: string; ten: string; }

export interface QuyChuan {
  id: string;
  loaiGiaoDich: string;
  nghiepVu: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  moTa?: string;
  hoSoChungTu?: HoSoChungTuRef[];
}

// ===== BÁO CÁO =====

export interface BaoCaoPnL {
  khoanMuc: string;
  thangTruoc: number;
  thangNay: number;
  luyKe: number;
  keHoach: number;
  chenhLech: number;
}

export interface SoCai {
  ngay: string;
  soPhieu: string;
  dienGiai: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
}

// ===== TENANT =====

export * from './tenant';

// ===== USER & PHÂN QUYỀN =====

export type VaiTro = string;

export interface NguoiDung {
  id: string;
  hoTen: string;
  email: string;
  vaiTro: VaiTro;
  isSuperAdmin?: boolean;
  tenants: import('./tenant').UserTenant[];
  trangThai: 'HOAT_DONG' | 'KHOA';
  isActive: boolean;
}

// ===== KHO =====

export type LoaiPhieuKho = 'NHAP' | 'XUAT' | 'CHUYEN';
export interface ChiTietPhieuKho {
  stt: number; hangHoaMa: string; hangHoaTen: string; quyCach?: string; donViTinh?: string;
  khoMa?: string; khoTen?: string; tkNo?: string; tkCo?: string;
  soLuong: number; soLuongChungTu?: number; soLuongThucTe?: number; donGia: number; thanhTien: number;
}
export interface PhieuKho {
  id: string; loaiPhieu: LoaiPhieuKho; soPhieu?: string; loaiNghiepVu?: string;
  ngayHachToan: string; ngayChungTu?: string; soChungTuGoc?: string; thamChieu?: string;
  doiTuongMa?: string; doiTuongTen?: string; diaChi?: string; nguoiGiaoNhan?: string; nhanVien?: string; dienGiai?: string;
  khoMa?: string; khoTen?: string; khoXuatMa?: string; khoXuatTen?: string; khoNhapMa?: string; khoNhapTen?: string;
  nguoiVanChuyen?: string; hopDongVC?: string; phuongTienVC?: string; lenhDieuDong?: string; veViec?: string;
  chiTiet: ChiTietPhieuKho[]; tongTien?: number; tongTienBangChu?: string; trangThai?: string;
}

// ===== HỒ SƠ CHỨNG TỪ =====

export interface HoSoChungTu {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

// ===== KIỂM SOÁT CHỨNG TỪ =====

// HOP_LE: hợp lệ. CHUA_HOP_LE: chưa hợp lệ (hồ sơ còn thiếu, hoàn thiện được;
// không tính chi phí không được trừ). KHONG_DUOC_TRU: không hợp lệ (chi phí không được trừ).
export type KiemSoatTrangThai = 'HOP_LE' | 'CHUA_HOP_LE' | 'KHONG_DUOC_TRU';

export interface HoSoChungTuItem {
  id: string;
  ma: string;
  ten: string;
  daCo: boolean;
}

export interface KiemSoatChungTu {
  trangThai: KiemSoatTrangThai;
  nhomChiPhi?: 1 | 2 | 3 | 4;
  soTienKhongTru?: number;
  // Danh sách lý do (chọn nhiều). Dữ liệu cũ có thể là string đơn.
  lyDo?: string[] | string;
  yKien?: string;
  nguoiKiemSoat?: string;
  ngayKiemSoat?: string;
}

// ===== DASHBOARD =====

export interface ThongKeTongQuan {
  soDuQuy: number;
  doanhThuThang: number;
  chiPhiThang: number;
  loiNhuanThang: number;
  congNoPhaiThu: number;
  congNoPhaiTra: number;
  soChungTuChoXuLy: number;
}

export interface BieuDoThuChi {
  thang: string;
  thu: number;
  chi: number;
}

// ===== MẦM NON / BẾP ĂN =====
export type PhamViDinhMuc = 'LOP' | 'DO_TUOI' | 'GOI_AN' | 'CHUNG';
export interface DinhMucTienAn {
  id: string; code: string; ten: string; phamVi?: PhamViDinhMuc; doiTuongMa?: string;
  mucTien: number; hieuLucTu?: string; hieuLucDen?: string; isActive?: boolean;
}
export type CachXuatCongThuc = 'DINH_LUONG' | 'THEO_SUAT';
export interface ChiTietCongThuc {
  hangHoaMa: string; hangHoaTen: string; dinhLuong: number; donViTinh?: string; cachXuat: CachXuatCongThuc;
}
export interface CongThucDinhLuong {
  id: string; code: string; ten: string; ganTheo?: string; doiTuongMa?: string;
  chiTiet: ChiTietCongThuc[]; isActive?: boolean;
}
export interface DiemDanhAn {
  id: string; ngay: string; lopMa: string; lopTen: string; goiAnMa?: string;
  soTreDangKy: number; soTreAnThucTe: number; congThucCode?: string; ghiChu?: string; isActive?: boolean;
}
export type TrangThaiDeXuat = 'NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_NHAN';
export interface ChiTietDeXuat {
  stt: number; hangHoaMa: string; hangHoaTen: string; donViTinh?: string; soLuong: number; donGia: number; thanhTien: number;
}
export interface DeXuatMua {
  id: string; soPhieu: string; ngayDeXuat: string; nguoiDeXuat?: string; doiTuongMa?: string; doiTuongTen?: string;
  chiTiet: ChiTietDeXuat[]; tongTien: number; trangThai: TrangThaiDeXuat;
  nguoiDuyet?: string; ngayDuyet?: string; lyDoTuChoi?: string; chungTuId?: string; soPhieuNhapKho?: string; isActive?: boolean;
}
export interface TieuHaoDong { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; soLuong: number; }
export interface KiemSoatChiPhi {
  nganSach: number; chiPhiThuc: number; chenhLech: number; haoPhiPct: number; vuot: boolean;
  tieuHao: TieuHaoDong[]; canhBaoDinhGiaThieu?: boolean; canhBaoTruncateNhap?: boolean;
}
