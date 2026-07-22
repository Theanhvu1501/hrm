import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Một dòng cho MỖI LẦN BẤM, không phải mỗi ngày một dòng. Append-only:
 * sửa thì thêm dòng nguonTao='hr_nhap' mới, không sửa dòng cũ. Tổng hợp
 * theo ngày là view tính ra, không lưu.
 */
@Entity('attendance_records')
export class AttendanceRecord extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;

  @Column() ngay: string; // "YYYY-MM-DD" theo giờ VN
  @Column() loai: string; // vao|ra
  @Column() thoiDiem: string; // ISO, LUÔN lấy từ đồng hồ máy chủ

  // Snapshot ca: HR đổi giờ ca tháng sau không được làm đổi lịch sử.
  @Column({ nullable: true }) workShiftId?: string;
  @Column({ nullable: true }) caTen?: string;
  @Column({ nullable: true }) caGioBatDau?: string;
  @Column({ nullable: true }) caGioKetThuc?: string;
  @Column({ default: false }) laCaQuaDem: boolean;

  @Column({ nullable: true }) locationId?: string;
  @Column({ nullable: true }) locationTen?: string;
  @Column({ nullable: true }) phuongThuc?: string; // gps|wifi|qr
  @Column({ nullable: true }) latitude?: number;
  @Column({ nullable: true }) longitude?: number;
  @Column({ nullable: true }) doChinhXacMet?: number;
  @Column({ nullable: true }) khoangCachMet?: number;
  @Column({ default: false }) ngoaiVung: boolean;
  @Column({ nullable: true }) ipAddress?: string;

  @Column({ nullable: true }) deviceId?: string;

  @Column({ default: 0 }) soPhutDiMuon: number; // chỉ có nghĩa khi loai='vao'
  @Column({ default: 0 }) soPhutVeSom: number; // chỉ có nghĩa khi loai='ra'

  // Snapshot: HR sửa lịch lễ về sau không được làm đổi lịch sử.
  @Column({ default: false }) laNgayNghi: boolean;

  @Column({ default: 'tu_cham' }) nguonTao: string; // tu_cham|hr_nhap
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface AttendanceRecordEntities {
  AttendanceRecord: typeof AttendanceRecord;
}
declare module '../entities' {
  interface Entities extends AttendanceRecordEntities {}
}
