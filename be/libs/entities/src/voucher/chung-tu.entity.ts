import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

// PHIEU_THU -> Phiếu thu, PHIEU_CHI -> Phiếu chi, KHAC -> chỉ hiện ở Nhật ký chung
export type LoaiChungTu = 'PHIEU_THU' | 'PHIEU_CHI' | 'KHAC';

// Types cho danh mục (embedded in ChungTu.danhMuc)
// Prefixed with DanhMuc to avoid conflicts with master-data entities
export interface DanhMucDoiTuong {
  ma: string;
  ten: string;
  loai: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
  // Số tài khoản ngân hàng (khi đối tượng là tài khoản ngân hàng/quỹ)
  soTaiKhoan?: string;
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

export interface DanhMucLoaiGiaoDich {
  ma: string;
  ten: string;
}

export interface DanhMucLoaiChungTu {
  ma: string;
  ten: string;
}

// Gộp tất cả danh mục vào 1 field
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
  chuDauTu?: DanhMucChuDauTu;
  nhomKhuyenMai?: DanhMucNhomKhuyenMai;
  nhomQuanLy?: DanhMucNhomQuanLy;
  nghiepVu?: DanhMucNghiepVu;
  loaiGiaoDich?: DanhMucLoaiGiaoDich;
  loaiChungTu?: DanhMucLoaiChungTu;
}

// Types cho kiểm soát hồ sơ & hạch toán
export interface HoSoChungTuChungTu { id: string; ma: string; ten: string; daCo: boolean; }
// HOP_LE: hợp lệ. CHUA_HOP_LE: chưa hợp lệ (hồ sơ còn thiếu, có thể hoàn thiện;
// KHÔNG tính vào chi phí không được trừ). KHONG_DUOC_TRU: không hợp lệ (chi phí không được trừ).
export type KiemSoatTrangThai = 'HOP_LE' | 'CHUA_HOP_LE' | 'KHONG_DUOC_TRU';
export interface KiemSoatChungTu {
  trangThai: KiemSoatTrangThai;
  nhomChiPhi?: 1 | 2 | 3 | 4;
  soTienKhongTru?: number;
  // Danh sách lý do (chọn nhiều) — dùng cho CHUA_HOP_LE và KHONG_DUOC_TRU.
  // Dữ liệu cũ có thể là string đơn; chuẩn hoá về mảng khi đọc ở FE.
  lyDo?: string[];
  yKien?: string;
  nguoiKiemSoat?: string;
  ngayKiemSoat?: string;
}

@Entity('chung_tu')
export class ChungTu extends BaseEntity {
  @Column()
  soPhieu: string;

  @Column()
  loai: LoaiChungTu;

  @Column()
  ngay: Date;

  // Ngày ghi sổ (mặc định = ngày phát sinh). Chỉ lưu/hiển thị, không dùng cho báo cáo.
  @Column({ nullable: true })
  ngayGhiSo?: Date;

  @Column()
  soTien: number;

  @Column()
  noiDung: string;

  @Column({ nullable: true })
  nguoiGiaoDich: string;

  @Column({ nullable: true })
  diaChi: string;

  @Column({ nullable: true })
  ghiChu: string;

  @Column()
  nguoiTaoId: string;

  // Gộp tất cả danh mục vào 1 field
  @Column({ type: 'simple-json', nullable: true })
  danhMuc: DanhMuc;

  @Column({ type: 'simple-json', nullable: true })
  hoSoChungTu?: HoSoChungTuChungTu[];

  @Column({ type: 'simple-json', nullable: true })
  kiemSoat?: KiemSoatChungTu;
}

export interface ChungTuEntities {
  ChungTu: typeof ChungTu;
}

declare module '../entities' {
  interface Entities extends ChungTuEntities {}
}
