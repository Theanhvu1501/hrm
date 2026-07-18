import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export interface BangCap { ten: string; noiCap?: string; nam?: string; }
export interface NguoiPhuThuoc { hoTen: string; quanHe?: string; ngaySinh?: string; giayTo?: string; }
export interface LienHeKhanCap { hoTen?: string; quanHe?: string; soDienThoai?: string; }

@Entity('employees')
export class Employee extends BaseEntity {
  @Column() employeeId: string;                 // NV0001 (unique per tenant, enforced in service)
  @Column() hoTen: string;
  @Column({ nullable: true }) ngaySinh?: string;
  @Column({ nullable: true }) gioiTinh?: string;       // nam|nu|khac
  @Column() cccd: string;
  @Column({ nullable: true }) mst?: string;
  @Column({ nullable: true }) soDienThoai?: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) diaChi?: string;
  @Column({ nullable: true }) phongBan?: string;
  @Column({ nullable: true }) chucDanh?: string;
  @Column({ nullable: true }) ngayVaoLam?: string;
  @Column({ default: 'thu_viec' }) loaiHopDong: string;   // thu_viec|chinh_thuc|dich_vu
  @Column({ default: 'dang_lam_viec' }) trangThai: string; // dang_lam_viec|da_nghi|tam_nghi
  @Column('json', { nullable: true }) bangCap?: BangCap[];
  @Column('json', { nullable: true }) nguoiPhuThuoc?: NguoiPhuThuoc[];
  @Column('json', { nullable: true }) lienHeKhanCap?: LienHeKhanCap;
  @Column({ default: true }) isActive: boolean;
}

@Entity('employee_counters')
export class EmployeeCounter extends BaseEntity {
  @Column() seq: number;   // last used sequence for this tenant
}

export interface NhanSuEntities { Employee: typeof Employee; EmployeeCounter: typeof EmployeeCounter; }
declare module '../entities' { interface Entities extends NhanSuEntities {} }
