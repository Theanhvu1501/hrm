import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Danh sách tất cả các cột có thể hiển thị trên bảng lương.
 * Dùng để UI render danh sách checkbox khi tạo/sửa mẫu in.
 */
export const TAT_CA_COT_BANG_LUONG = [
  'stt',
  'maNhanVien',
  'hoTen',
  'chucDanh',
  'phongBan',
  'luongThoaThuan',
  'mucKhaiBao',
  'ngayCongChuan',
  'congThucTe',
  'congThuViec',
  'nghiPhep',
  'nghiLe',
  'luongTheoCong',
  'phuCapAnCa',
  'phuCapXang',
  'phuCapDienThoai',
  'phuCapKhac',
  'tongPhuCap',
  'thuongHieuSuat',
  'tongThuNhap',
  'bhxhNld',
  'bhytNld',
  'bhtnNld',
  'tongBhNld',
  'thueTncn',
  'tamUng',
  'khauTruKhac',
  'thucNhan',
] as const;

export type CotBangLuong = (typeof TAT_CA_COT_BANG_LUONG)[number];

/** Nhãn tiếng Việt cho từng cột. */
export const NHAN_COT: Record<CotBangLuong, string> = {
  stt: 'STT',
  maNhanVien: 'Mã NV',
  hoTen: 'Họ và tên',
  chucDanh: 'Chức danh',
  phongBan: 'Phòng ban',
  luongThoaThuan: 'Lương thỏa thuận',
  mucKhaiBao: 'Mức khai báo',
  ngayCongChuan: 'Ngày công chuẩn',
  congThucTe: 'Công thực tế',
  congThuViec: 'Công thử việc',
  nghiPhep: 'Nghỉ phép',
  nghiLe: 'Nghỉ lễ',
  luongTheoCong: 'Lương theo công',
  phuCapAnCa: 'PC ăn ca',
  phuCapXang: 'PC xăng xe',
  phuCapDienThoai: 'PC điện thoại',
  phuCapKhac: 'PC khác',
  tongPhuCap: 'Tổng phụ cấp',
  thuongHieuSuat: 'Thưởng hiệu suất',
  tongThuNhap: 'Tổng thu nhập',
  bhxhNld: 'BHXH NLĐ',
  bhytNld: 'BHYT NLĐ',
  bhtnNld: 'BHTN NLĐ',
  tongBhNld: 'Tổng BH NLĐ',
  thueTncn: 'Thuế TNCN',
  tamUng: 'Tạm ứng',
  khauTruKhac: 'Khấu trừ khác',
  thucNhan: 'Thực nhận',
};

/**
 * Mẫu in bảng lương — cho phép HR tạo nhiều mẫu với các cột khác nhau.
 *
 * Yêu cầu d37: "Cho chọn các nội dung trên bản in: Bản full hoặc Tạo các mẫu
 * bản in có các chỉ tiêu muốn chọn khác nhau."
 */
@Entity('mau_in_bang_luong')
export class MauInBangLuong extends BaseEntity {
  @Column()
  tenMau: string;

  @Column({ nullable: true })
  moTa?: string;

  /** Danh sách mã cột được chọn hiển thị, theo thứ tự. */
  @Column('simple-array')
  cacCot: CotBangLuong[];

  /** Mẫu mặc định (Đầy đủ) không xóa được. */
  @Column({ default: false })
  laMacDinh: boolean;

  @Column({ default: true })
  isActive: boolean;
}

export interface MauInBangLuongEntities {
  MauInBangLuong: typeof MauInBangLuong;
}
declare module '../entities' {
  interface Entities extends MauInBangLuongEntities {}
}
