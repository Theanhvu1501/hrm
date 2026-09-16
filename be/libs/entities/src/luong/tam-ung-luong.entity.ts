import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Đơn đề nghị TẠM ỨNG LƯƠNG (yêu cầu d30: "Đơn đề nghị tạm ứng -> Duyệt",
 * liên kết sang ô Tạm ứng của bảng lương).
 *
 * Vì sao là một entity riêng chứ không chỉ để kế toán gõ số vào ô `tamUng`
 * của dòng lương: ô đó không trả lời được "ai duyệt, duyệt lúc nào, vì lý do
 * gì" — mà tạm ứng là tiền đưa trước, đúng thứ cần hỏi lại khi đối soát.
 * Bảng lương vẫn giữ ô `tamUng` và vẫn sửa tay được; số từ đơn chỉ là nguồn
 * mặc định lúc tổng hợp.
 */
@Entity('tam_ung_luong')
export class TamUngLuong extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;

  /** Kỳ lương sẽ TRỪ khoản này, 'YYYY-MM'. */
  @Column()
  @Index()
  thang: string;

  @Column() ngayDeNghi: string; // 'YYYY-MM-DD'
  @Column({ default: 0 }) soTien: number;
  @Column({ nullable: true }) lyDo?: string;

  /** cho_duyet | da_duyet | tu_choi */
  @Column({ default: 'cho_duyet' }) trangThai: string;
  @Column({ nullable: true }) nguoiDuyet?: string;
  @Column({ nullable: true }) ngayDuyet?: string;
  /** Lý do từ chối — người nộp đơn phải biết vì sao, không chỉ thấy chữ "Từ chối". */
  @Column({ nullable: true }) lyDoTuChoi?: string;

  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface TamUngLuongEntities {
  TamUngLuong: typeof TamUngLuong;
}

declare module '../entities' {
  interface Entities extends TamUngLuongEntities {}
}
