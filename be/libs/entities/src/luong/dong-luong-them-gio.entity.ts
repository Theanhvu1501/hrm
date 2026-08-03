import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Một nhóm cột trên mẫu 03-LĐTL: Số giờ + Thành tiền của một loại ngày. */
export interface DongThemGioTheoLoai {
  soGio: number;
  /** Hệ số TRẢ TIỀN đã dùng — snapshot, không tra lại cấu hình khi đọc. */
  heSo: number;
  thanhTien: number;
}

/**
 * Một dòng bảng thanh toán tiền làm thêm giờ (mẫu 03-LĐTL) của MỘT nhân viên
 * trong MỘT kỳ.
 *
 * Tách khỏi `DongLuong` chứ không thêm cột vào đó: hai bảng chốt kỳ ĐỘC LẬP
 * (kế toán chốt bảng thêm giờ trước, rồi bảng lương chính mới đọc số đã chốt
 * — xem spec P4.2c §5), và mẫu 03-LĐTL là sản phẩm bàn giao riêng có chỗ ký.
 *
 * Tiền ở đây KHÔNG làm tròn: dòng thật trong sheet `LÀM THÊM GIỜ` của chủ sản
 * phẩm là 1.503.906,25. Làm tròn chỉ xảy ra khi con số này thành khoản
 * `TIEN_OT` trong bảng lương chính (P4.2c-2), qua `lamTronTheo()`.
 */
@Entity('dong_luong_them_gio')
export class DongLuongThemGio extends BaseEntity {
  @Column() thang: string; // 'YYYY-MM'
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;

  // ── Snapshot mẫu số của đơn giá ──────────────────────────────────────────
  @Column({ default: 0 }) luongThang: number;
  @Column({ default: 26 }) congChuan: number;
  @Column({ default: 8 }) soGioMoiNgay: number;
  @Column({ default: 0 }) donGiaNgay: number;
  @Column({ default: 0 }) donGiaGio: number;

  /** Khoá = mã loại ngày (`ngay_thuong`, `ngay_dem`, …), theo `uuTienLoai`. */
  @Column('json', { nullable: true })
  theoLoai: Record<string, DongThemGioTheoLoai>;

  @Column({ default: 0 }) tongTien: number;

  /** Giờ nghỉ bù đã dùng trong kỳ — cột THÔNG TIN trên biểu mẫu, xem service. */
  @Column({ default: 0 }) gioNghiBu: number;
  @Column({ default: 0 }) tienNghiBu: number;
  @Column({ default: 0 }) thucNhan: number;

  /** Giờ quy đổi từ quỹ hết hạn `quy_ra_tien`. */
  @Column({ default: 0 }) gioOtHetHan: number;
  /**
   * Tiền của `gioOtHetHan`, nhân hệ số 1.0 — giờ trong quỹ ĐÃ được nhân
   * `heSoTichQuy` lúc tích. Cũng vì vậy sổ quỹ không còn giữ loại ngày gốc nên
   * KHÔNG tách được phần chênh: khoản này chịu thuế TOÀN BỘ (spec P4.2c §2.2).
   */
  @Column({ default: 0 }) tienOtHetHan: number;
  /** Phần chênh được miễn thuế TNCN — bảng lương chính đọc thẳng số này. */
  @Column({ default: 0 }) otMienThue: number;

  /**
   * Kế toán đã sửa tay dòng này. `tongHop()` chạy lại KHÔNG ghi đè dòng đã
   * sửa tay — cùng quy ước `nhapTheoKy` của bảng lương chính: tổng hợp lại là
   * thao tác thường ngày, và ghi đè số kế toán vừa sửa là mất việc của họ.
   */
  @Column({ default: false }) suaTay: boolean;

  @Column({ default: 'nhap' }) trangThai: string; // nhap|chot
  @Column({ default: true }) isActive: boolean;
}

export interface DongLuongThemGioEntities {
  DongLuongThemGio: typeof DongLuongThemGio;
}
declare module '../entities' {
  interface Entities extends DongLuongThemGioEntities {}
}
