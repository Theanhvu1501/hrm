import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { CauHinhLuongApDung, KetQuaLuong } from './luong.types';

@Entity('dong_luong')
export class DongLuong extends BaseEntity {
  @Column() thang: string; // 'YYYY-MM'
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;

  // Snapshot đầu vào (đóng băng khi chốt kỳ)
  @Column({ default: 0 }) congThuong: number;
  @Column({ default: 0 }) congThuViec: number;
  @Column({ default: 0 }) congKhac: number;
  @Column({ default: 0 }) luongThoaThuan: number;
  @Column({ default: 0 }) mucKhaiBao: number;
  @Column({ default: 0 }) phuCapCoDinh: number;
  @Column({ default: 0 }) soNguoiPhuThuoc: number;
  @Column({ default: false }) dongBH: boolean;
  @Column({ default: false }) thoiVu: boolean;
  @Column({ default: false }) camKet: boolean;
  @Column({ default: false }) hopDongThu2: boolean;
  /**
   * Cấu hình đã RESOLVE cho NV này lúc tổng hợp (không còn `undefined`).
   * Lưu để (a) đọc một dòng lương là biết ngay số nào đã dùng, (b) sửa khoản
   * biến động tính lại không phải đọc lại hồ sơ NV — hồ sơ có thể đã đổi.
   */
  @Column('json', { nullable: true }) cauHinhApDung: CauHinhLuongApDung;
  @Column({ default: 0 }) tamUng: number;
  @Column({ default: 0 }) khauTruKhac: number;
  @Column('json', { nullable: true }) nhapTheoKy: Record<string, number>;

  // Kết quả engine cho hai mức
  @Column('json', { nullable: true }) khaiBao: KetQuaLuong;
  @Column('json', { nullable: true }) thucTe: KetQuaLuong;

  @Column({ default: 'nhap' }) trangThai: string; // nhap|chot (theo kỳ)
  @Column({ default: true }) isActive: boolean;
}

export interface DongLuongEntities { DongLuong: typeof DongLuong; }
declare module '../entities' { interface Entities extends DongLuongEntities {} }
