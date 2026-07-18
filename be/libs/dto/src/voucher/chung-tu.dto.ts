// Chung Tu DTOs
export type LoaiChungTu = 'PHIEU_THU' | 'PHIEU_CHI';

// Types cho danh mục (embedded in ChungTu.danhMuc)
// Prefixed with DanhMuc to avoid conflicts with master-data DTOs
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

export interface DanhMucNghiepVu {
  ma: string;
  ten: string;
}

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
  nghiepVu?: DanhMucNghiepVu;
}

export interface ChungTuResponse {
  _id: string;
  soPhieu: string;
  loai: LoaiChungTu;
  ngay: Date;
  soTien: number;
  noiDung: string;
  nguoiTaoId: string;
  ngayTao: Date;
  danhMuc?: DanhMuc;
}

export interface CreateChungTuRequest {
  loai: LoaiChungTu;
  ngay: string;
  soTien: number;
  noiDung: string;
  danhMuc?: DanhMuc;
}

export interface UpdateChungTuRequest {
  ngay?: string;
  soTien?: number;
  noiDung?: string;
  danhMuc?: DanhMuc;
}

export interface ChungTuQueryParams {
  loai?: LoaiChungTu;
  startDate?: string;
  endDate?: string;
}

export interface ChungTuDTOs {
  ChungTuResponse: ChungTuResponse;
  CreateChungTuRequest: CreateChungTuRequest;
  UpdateChungTuRequest: UpdateChungTuRequest;
  ChungTuQueryParams: ChungTuQueryParams;
}

declare module '../dto' {
  interface DTOs extends ChungTuDTOs {}
}
