import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { CauHinhLuongRieng } from '../luong/luong.types';

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
  /** Ngày cấp CCCD, "YYYY-MM-DD". In lên hợp đồng lao động ({{ngayCapCccd}}). */
  @Column({ nullable: true }) ngayCapCccd?: string;
  @Column({ nullable: true }) noiCapCccd?: string;
  @Column({ nullable: true }) mst?: string;
  @Column({ nullable: true }) soDienThoai?: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) diaChi?: string;
  /**
   * Phòng ban — id trỏ tới danh mục của identity-service (`departments._id`).
   * hrm KHÔNG sở hữu danh mục này; lấy tên qua `GET /phong-ban`.
   * Trước đây là chuỗi tự do `phongBan`, đã di trú (xem
   * scripts/migrations/migrate-phongban-to-departmentid.ts).
   */
  @Column({ nullable: true }) departmentId?: string | null;
  @Column({ nullable: true }) chucDanh?: string;
  @Column({ nullable: true }) ngayVaoLam?: string;
  /**
   * Ngày lên chính thức — mốc MỞ KHOÁ quỹ phép (P3.8). Trống = đang thử việc,
   * quỹ phép = 0 và không nộp được đơn `phep_nam`.
   *
   * KHÔNG phải mốc tính số ngày phép: prorate và thâm niên đều đếm từ
   * `ngayVaoLam`, gồm cả thời gian thử việc (NĐ 145/2020 Đ65.2).
   */
  @Column({ nullable: true }) ngayChinhThuc?: string;
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
  /**
   * Số tiền RIÊNG của người này cho từng khoản lương, khoá theo `ma` khoản.
   * Vắng khoá = ăn mức chung của công ty; CÓ khoá kể cả bằng 0 = dùng đúng số
   * đó (người này không có khoản đó). Xem `giaTriRieng()` trong tinh-luong.ts.
   */
  @Column('json', { nullable: true }) giaTriKhoan?: Record<string, number>;
  @Column({ default: 0 }) soNguoiPhuThuoc: number;
  @Column({ default: false }) dongBH: boolean;
  @Column({ default: false }) thoiVu: boolean;
  @Column({ default: false }) camKet: boolean;
  // ── Lương (P4.1) ──
  /**
   * Override cấu hình lương cho riêng NV này — trường để trống thì kế thừa
   * `CauHinhLuong` của công ty (xem `ganCauHinhRieng`). Chỉ chứa tham số mang
   * tính thỏa thuận riêng; tham số là luật (giảm trừ, bậc thuế) cố ý KHÔNG
   * override được.
   */
  @Column('json', { nullable: true }) cauHinhLuongRieng?: CauHinhLuongRieng;
  /**
   * NV làm ở 2 công ty và ĐÂY là HĐLĐ thứ 2: BHXH/BHYT/BHTN đã đóng ở nơi thứ
   * nhất (NLĐ không bị trừ tại đây), giảm trừ gia cảnh cũng đăng ký ở đó (tại
   * đây giảm trừ = 0, vẫn lũy tiến), công ty chỉ chịu BHTNLĐ-BNN.
   */
  @Column({ default: false }) hopDongThu2: boolean;
  @Column({ default: true }) isActive: boolean;
}

@Entity('employee_counters')
export class EmployeeCounter extends BaseEntity {
  @Column() seq: number;   // last used sequence for this tenant
}

export interface NhanSuEntities { Employee: typeof Employee; EmployeeCounter: typeof EmployeeCounter; }
declare module '../entities' { interface Entities extends NhanSuEntities {} }
