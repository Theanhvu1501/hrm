import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Căn cứ ra con số `soNgayDuocCap` — snapshot lúc cấp, xem `luat-phep.ts`. */
export interface CanCuCapPhep {
  ngayVaoLam: string;
  soThang: number;
  thamNienNam: number;
  mucCaNam: number;
}

/**
 * Số dư quỹ phép của một (nhân viên, năm, loại quỹ).
 *
 * Đây chỉ là BẢN TỔNG HỢP cho nhanh — nguồn sự thật là `leave_balance_entries`.
 * `QuyPhep_Service.doiSoat()` phải dựng lại được đúng các con số ở đây từ sổ;
 * lệch nghĩa là có nơi nào đó ghi số dư mà quên ghi sổ.
 */
@Entity('leave_balances')
export class LeaveBalance extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  @Column() nam: number;
  @Column({ default: 'phep_nam' }) loaiQuy: string; // phep_nam|nghi_bu
  @Column({ default: 0 }) soNgayDuocCap: number;
  @Column({ default: 0 }) soNgayDaDung: number;
  /** Đơn `cho_duyet` đang giữ chỗ — chặn nộp nhiều đơn cùng ăn một số dư. */
  @Column({ default: 0 }) soNgayDangChoDuyet: number;
  /** LUÔN tính lại = duocCap - daDung - dangChoDuyet. Không nhận từ client. */
  @Column({ default: 0 }) soNgayConLai: number;
  /** "YYYY-03-31" của năm sau. Ngày nghỉ sau mốc này không ăn được quỹ này. */
  @Column() hanDung: string;
  @Column({ default: 'dang_hieu_luc' }) trangThai: string; // dang_hieu_luc|da_dong
  @Column('json', { nullable: true }) canCuCap?: CanCuCapPhep;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

/**
 * Sổ biến động quỹ — APPEND-ONLY, không sửa, không xoá.
 *
 * Vì sao phải có sổ riêng thay vì chỉ giữ số dư: khi NV hỏi "sao tôi mất 2
 * ngày phép", HR phải trả lời được. Không có sổ thì mọi tranh chấp thành lời
 * nói suông và bug cộng trừ sai không bao giờ truy ra nguyên nhân.
 */
@Entity('leave_balance_entries')
export class LeaveBalanceEntry extends BaseEntity {
  @Column() balanceId: string;
  @Column() employeeId: string;
  @Column() nam: number;
  @Column() loaiQuy: string;
  /** Dương = cộng vào quỹ, âm = trừ khỏi quỹ. */
  @Column() soNgay: number;
  // cap_dau_nam|cap_len_chinh_thuc|cap_bu_nam_truoc|duyet_don|huy_don|dieu_chinh_tay|het_han
  @Column() lyDo: string;
  @Column({ nullable: true }) requestId?: string;
  @Column({ nullable: true }) nguoiThucHien?: string;
  @Column() thoiDiem: string; // ISO
  @Column({ nullable: true }) ghiChu?: string;
}

/** Một đơn nghỉ phép trừ vào quỹ nào, bao nhiêu ngày. */
export interface PhanBoQuy {
  balanceId: string;
  nam: number;
  soNgay: number;
}

export interface QuyPhepEntities {
  LeaveBalance: typeof LeaveBalance;
  LeaveBalanceEntry: typeof LeaveBalanceEntry;
}
declare module '../entities' {
  interface Entities extends QuyPhepEntities {}
}
