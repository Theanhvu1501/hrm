import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('employment_histories')
export class EmploymentHistory extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;   // denormalized
  @Column({ nullable: true }) employeeCode?: string;   // denormalized NV####
  /**
   * dieu_chuyen | tang_luong | bo_nhiem | thoi_viec | khac
   *
   * `doi_trang_thai` và `danh_gia` KHÔNG còn được chọn mới (yêu cầu d13: đổi
   * trạng thái trùng với màn Thôi việc, còn "Đánh giá" thì không ai định nghĩa
   * được nó ghi nhận cái gì). Bản ghi cũ mang hai giá trị đó vẫn đọc và hiện
   * bình thường — xoá nhãn của chúng là làm hỏng lịch sử đã lưu.
   *
   * `thoi_viec` do màn Thôi việc tự sinh khi duyệt, không nhập tay: có đúng
   * MỘT nơi nhập liệu cho một sự kiện, còn dòng thời gian thì đủ ở một chỗ.
   */
  @Column() loaiThayDoi: string;
  @Column() ngayHieuLuc: string;
  @Column({ nullable: true }) phongBanCu?: string;
  @Column({ nullable: true }) phongBanMoi?: string;
  @Column({ nullable: true }) chucDanhCu?: string;
  @Column({ nullable: true }) chucDanhMoi?: string;
  @Column({ nullable: true }) trangThaiCu?: string;    // dang_lam_viec|tam_nghi|da_nghi
  @Column({ nullable: true }) trangThaiMoi?: string;
  /**
   * Lương thoả thuận TRƯỚC và SAU thay đổi.
   *
   * Từ yêu cầu d13 cột G ("khi thay đổi thì thông tin lương của NLĐ cần được
   * thay đổi"), `mucLuongMoi` KHÔNG còn là thông tin trang trí trên quyết
   * định: nó được ghi thẳng vào `Employee.luongThoaThuan`. `mucLuongCu` là
   * ảnh chụp để còn đối chiếu và để in phụ lục hợp đồng.
   */
  @Column({ nullable: true }) mucLuongCu?: number;
  @Column({ nullable: true }) mucLuongMoi?: number;
  /**
   * Lương đóng BHXH TRƯỚC và SAU thay đổi.
   * Ghi vào `Employee.luongDongBH` khi áp dụng. Điều chỉnh 20/9 #4.
   */
  @Column({ nullable: true }) luongKhaiBaoCu?: number;
  @Column({ nullable: true }) luongKhaiBaoMoi?: number;
  /**
   * Mức phụ cấp/KPI RIÊNG mới theo từng khoản lương (khoá là `ma` khoản).
   * Ghi đè vào `Employee.giaTriKhoan` — xem `apDungThayDoi`.
   */
  @Column('json', { nullable: true }) phuCapMoi?: Record<string, number>;
  /** Ảnh chụp `Employee.giaTriKhoan` trước khi ghi đè, để in phụ lục và đối chiếu. */
  @Column('json', { nullable: true }) phuCapCu?: Record<string, number>;
  @Column({ nullable: true }) soQuyetDinh?: string;
  @Column({ nullable: true }) lyDo?: string;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface QuaTrinhEntities { EmploymentHistory: typeof EmploymentHistory; }
declare module '../entities' { interface Entities extends QuaTrinhEntities {} }
