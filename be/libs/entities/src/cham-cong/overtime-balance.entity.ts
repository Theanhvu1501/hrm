import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Số dư quỹ giờ làm thêm của một (nhân viên, tháng tích).
 *
 * ĐƠN VỊ: "giờ nghỉ được hưởng" — giờ OT ĐÃ nhân hệ số tích. Làm thêm 8 giờ
 * ngày lễ với hệ số 3,0 thì `soGioTich` là 24, và nghỉ bù 2 giờ trừ đúng 2.
 *
 * Gom theo THÁNG TÍCH chứ không mỗi đơn một lô: số hàng có trần 12/năm/người,
 * và các đơn cùng tháng chia chung hạn dùng — đủ chính xác cho nghiệp vụ.
 *
 * Đây chỉ là BẢN TỔNG HỢP cho nhanh — nguồn sự thật là `overtime_balance_entries`.
 * `QuyGio_Service.doiSoat()` phải dựng lại được đúng các số ở đây từ sổ.
 */
@Entity('overtime_balances')
export class OvertimeBalance extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  @Column() kyTich: string; // "YYYY-MM"
  @Column({ default: 0 }) soGioTich: number;
  @Column({ default: 0 }) soGioDaDung: number;
  /** Đơn `cho_duyet` đang giữ chỗ — chặn hai đơn cùng ăn một số dư. */
  @Column({ default: 0 }) soGioDangChoDuyet: number;
  /** LUÔN tính lại = tich - daDung - dangChoDuyet. Không nhận từ client. */
  @Column({ default: 0 }) soGioConLai: number;
  @Column() hanDung: string; // "YYYY-MM-DD"; '9999-12-31' = không hết hạn
  @Column({ default: 'dang_hieu_luc' }) trangThai: string; // dang_hieu_luc|da_dong
  /**
   * Kỳ lương đã trả tiền phần hết hạn của quỹ này ("YYYY-MM"), rỗng = chưa trả.
   * Chặng P4.2b dùng. BẮT BUỘC có từ chặng này: thiếu cờ, mỗi lần tổng hợp lại
   * một kỳ lương sẽ cộng lại số giờ hết hạn đó và trả tiền nhiều lần cho cùng
   * một quỹ đã đóng.
   */
  @Column({ nullable: true }) kyLuongTra?: string;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

/**
 * Sổ biến động quỹ giờ — APPEND-ONLY, không sửa, không xoá.
 *
 * Cùng lý do đã ghi ở quỹ phép: khi nhân viên hỏi "sao tôi mất 6 giờ", HR
 * phải trả lời được. Không có sổ thì mọi tranh chấp thành lời nói suông và
 * bug cộng trừ sai không bao giờ truy ra nguyên nhân.
 */
@Entity('overtime_balance_entries')
export class OvertimeBalanceEntry extends BaseEntity {
  @Column() balanceId: string;
  @Column() employeeId: string;
  @Column() kyTich: string;
  /** Dương = cộng vào quỹ, âm = trừ khỏi quỹ. */
  @Column() soGio: number;
  // duyet_don_ot|huy_don_ot|giu_cho_nghi_bu|duyet_nghi_bu|huy_nghi_bu|
  // het_han|quy_ra_tien|dieu_chinh_tay
  @Column() lyDo: string;
  @Column({ nullable: true }) requestId?: string;
  @Column({ nullable: true }) nguoiThucHien?: string;
  @Column() thoiDiem: string; // ISO
  @Column({ nullable: true }) ghiChu?: string;
}

/**
 * Một đơn nghỉ bù trừ vào quỹ nào, bao nhiêu giờ.
 *
 * CỐ Ý trùng cấu trúc với `PhanBoQuyGio` trong `quy-gio/luat-quy-gio.ts` chứ
 * không import chéo: `libs/entities` không được phụ thuộc vào `apps/`, và file
 * luật thuần không nên kéo `@app/entities` vào. Đây đúng là khuôn sẵn có trong
 * repo — `CanCuCapPhep` cũng khai hai lần, ở `leave-balance.entity.ts` và
 * `quy-phep/luat-phep.ts`. ĐỪNG "sửa" thành import chéo.
 */
export interface PhanBoQuyGio {
  balanceId: string;
  kyTich: string;
  soGio: number;
}

export interface QuyGioEntities {
  OvertimeBalance: typeof OvertimeBalance;
  OvertimeBalanceEntry: typeof OvertimeBalanceEntry;
}
declare module '../entities' {
  interface Entities extends QuyGioEntities {}
}
