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
  // Liên kết tài khoản SSO: `sub` của identity. Do HR gán có chủ ý —
  // KHÔNG tự khớp theo email vì email nullable và không unique.
  @Column({ nullable: true }) userId?: string;
  @Column({ nullable: true }) workShiftId?: string;
  // 0=CN, 1=T2 … 6=T7 — khớp Date.getDay()
  @Column('json', { nullable: true }) ngayLamViecTrongTuan?: number[];
  /**
   * Cho phép nhân viên này chấm công cả khi đứng NGOÀI bán kính địa điểm.
   *
   * Mặc định không bật: từ P3.5 trở đi, chấm ngoài bán kính bị CHẶN. Cờ này
   * là lối mở có chủ đích cho các trường hợp thật — nhân viên thị trường, đi
   * công trình, làm tại nhà — do HR bật cho từng người.
   *
   * Bản ghi tạo ra vẫn giữ `ngoaiVung: true` để HR còn nhìn thấy; cờ chỉ bỏ
   * chặn, không tẩy dấu vết.
   */
  @Column({ default: false }) choPhepChamNgoaiVung: boolean;
  // ── Lương (P4) ──
  @Column({ default: 0 }) luongThoaThuan: number;
  @Column({ nullable: true }) mucKhaiBao?: number; // rỗng → dùng mucKhaiBaoMacDinh
  @Column({ default: 0 }) phuCapCoDinh: number;
  @Column({ default: 0 }) soNguoiPhuThuoc: number;
  @Column({ default: false }) dongBH: boolean;
  @Column({ default: false }) thoiVu: boolean;
  @Column({ default: false }) camKet: boolean;
  @Column({ default: true }) isActive: boolean;
}

@Entity('employee_counters')
export class EmployeeCounter extends BaseEntity {
  @Column() seq: number;   // last used sequence for this tenant
}

export interface NhanSuEntities { Employee: typeof Employee; EmployeeCounter: typeof EmployeeCounter; }
declare module '../entities' { interface Entities extends NhanSuEntities {} }
