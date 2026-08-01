import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { PhanBoQuy } from './leave-balance.entity';
import type { PhanBoQuyGio as PhanBoQuyGioType } from './overtime-balance.entity';

@Entity('attendance_requests')
export class AttendanceRequest extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  @Column() loaiDon: string; // giai_trinh|lam_them_gio|nghi_phep|nghi_bu
  @Column() ngay: string;
  @Column({ nullable: true }) lyDo?: string;
  @Column({ nullable: true }) gioTu?: string; // "HH:mm", for OT
  @Column({ nullable: true }) gioDen?: string; // "HH:mm", for OT
  @Column({ nullable: true }) minhChung?: string;
  @Column({ default: 'cho_duyet' }) trangThai: string; // cho_duyet|da_duyet|tu_choi
  @Column({ nullable: true }) nguoiDuyet?: string;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;

  // ── Đơn nghỉ phép (nghi_phep|nghi_bu): khoảng ngày [ngay, denNgay] ────────
  @Column({ nullable: true }) denNgay?: string; // "YYYY-MM-DD", ngày cuối của khoảng nghỉ
  @Column({ nullable: true }) buoi?: string; // ca_ngay|sang|chieu — chỉ có ý nghĩa khi đơn đúng 1 ngày
  @Column({ nullable: true }) loaiNghi?: string; // phep_nam|khong_luong|om_dau|thai_san|cuoi_hoi|tang

  /**
   * Chỉ đơn `nghi_bu`: nghỉ trọn ngày hay nghỉ lẻ giờ.
   *
   * KHAI TƯỜNG MINH, không suy từ việc `gioTu` có rỗng hay không. Suy ngầm từ
   * chuỗi rỗng chính là lớp lỗi đã làm chết toàn bộ chức năng lập đơn thôi việc
   * và làm hỏng việc tạo nhân viên (`userId: ""` lọt vào partial unique index).
   */
  @Column({ nullable: true }) kieuNghi?: string; // theo_ngay|theo_gio

  /**
   * Chỉ đơn `lam_them_gio`, và chỉ có nghĩa khi công ty đặt chế độ bù là
   * `nhan_vien_chon`. Các chế độ khác backend tự quyết và bỏ qua giá trị này.
   */
  @Column({ nullable: true }) hinhThucBu?: string; // tien|nghi_bu

  // ── Các trường BACKEND TỰ TÍNH (Task 3, dùng luat-don.ts) ─────────────────
  // Cố ý KHÔNG có mặt trong CreateDonChamCongDto: nhận từ client là mở đường
  // cho người nộp đơn tự khai số ngày nghỉ hoặc hệ số OT của chính mình.
  @Column({ nullable: true }) soNgayNghi?: number; // kết quả tinhSoNgayNghi()
  @Column({ nullable: true }) soGioOt?: number; // kết quả tinhSoGioOt()
  @Column({ nullable: true }) heSoOt?: number; // kết quả suyHeSoOt().heSoOt
  @Column({ nullable: true }) loaiNgayOt?: string; // kết quả suyHeSoOt().loaiNgayOt
  /**
   * Đơn `nghi_phep` với `loaiNghi='phep_nam'` đã giữ chỗ ở quỹ nào, bao nhiêu
   * (P3.8). Backend tự ghi lúc tạo đơn — CỐ Ý không có trong DTO.
   *
   * Vì sao phải snapshot thay vì suy lại lúc duyệt: giữa lúc nộp và lúc duyệt,
   * quỹ có thể đã bị đóng (hết 31/3) hoặc đã được cấp thêm. Suy lại là hoàn
   * nhầm quỹ — huỷ một đơn của tháng 3 sau ngày 31/3 sẽ biến phép hết hạn
   * thành phép mới.
   */
  @Column('json', { nullable: true }) phanBoQuy?: PhanBoQuy[];

  /** Số giờ đơn `nghi_bu` này trừ vào quỹ giờ. Backend tự tính — CỐ Ý không có trong DTO. */
  @Column({ nullable: true }) soGioNghiBu?: number;

  /** Đơn `nghi_bu` đã giữ chỗ ở quỹ giờ nào, bao nhiêu. Snapshot lúc tạo, cùng lý do `phanBoQuy`. */
  @Column('json', { nullable: true }) phanBoQuyGio?: PhanBoQuyGioType[];

  // ── Vết duyệt đơn ─────────────────────────────────────────────────────────
  @Column({ nullable: true }) nguoiDuyetId?: string; // id người duyệt, khác `nguoiDuyet` (tên hiển thị)
  @Column({ nullable: true }) thoiDiemDuyet?: string; // ISO timestamp lúc duyệt/từ chối
}

export interface AttendanceRequestEntities {
  AttendanceRequest: typeof AttendanceRequest;
}
declare module '../entities' {
  interface Entities extends AttendanceRequestEntities {}
}
