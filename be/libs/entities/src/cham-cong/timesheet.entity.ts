import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export interface ChiTietNgayCong {
  ngay: number; // 1..31
  kyHieu: string;
  /**
   * 'tu_dong' | 'hr_sua' — xem NGUON_O trong bang-cong/cham-cong-ky-hieu.ts.
   * Vắng mặt = dữ liệu cũ = coi như 'hr_sua' (nguonCuaO()).
   */
  nguon?: string;
  /** Mã cảnh báo của ô, xem MA_CANH_BAO trong bang-cong/suy-ky-hieu.ts. */
  canhBao?: string[];
}

@Entity('timesheets')
export class Timesheet extends BaseEntity {
  @Column() thang: string; // "YYYY-MM"
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  @Column('json', { nullable: true }) chiTietNgay?: ChiTietNgayCong[];
  @Column({ default: 0 }) soNgayCong: number; // computed from chiTietNgay
  @Column({ default: 0 }) soNgayNghiPhep: number; // computed: count of 'P'
  @Column({ default: 0 }) soNgayNghiKhongLuong: number; // computed: count of 'KL'
  @Column({ default: 0 }) soNgayOm: number; // computed: count of 'O'
  /**
   * Số ô rơi vào "ngày làm việc nhưng không có căn cứ nào" — tính ra, không
   * nhập tay. `> 0` thì chặn chốt: chốt một bảng công còn ô trống là chốt một
   * kỳ lương thiếu ngày mà không ai biết.
   */
  @Column({ default: 0 }) soOTrong: number;
  /** Số ô có cảnh báo. Chỉ để hiển thị, không chặn gì. */
  @Column({ default: 0 }) soOCanhBao: number;
  @Column({ default: 0 }) soGioLamThem: number; // OT hours, auto-filled from approved requests
  @Column({ default: 0 }) soLanDiMuon: number;
  @Column({ default: 0 }) soLanVeSom: number;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: 'nhap' }) trangThai: string; // nhap|chot
  @Column({ default: true }) isActive: boolean;
}

export interface TimesheetEntities {
  Timesheet: typeof Timesheet;
}
declare module '../entities' {
  interface Entities extends TimesheetEntities {}
}
