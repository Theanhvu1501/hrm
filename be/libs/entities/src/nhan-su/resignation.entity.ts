import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export interface ChecklistBanGiaoItem {
  noiDung: string;
  hoanThanh: boolean;
}

@Entity('resignations')
export class Resignation extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string; // denormalized
  @Column({ nullable: true }) employeeCode?: string; // denormalized NV####
  @Column() ngayNopDon: string;
  @Column({ nullable: true }) ngayLamViecCuoi?: string;
  @Column() loaiThoiViec: string; // tu_nguyen|ky_luat|het_han_hd|khac
  @Column({ nullable: true }) lyDo?: string;
  @Column({ nullable: true }) viPham?: string;
  @Column('json', { nullable: true }) checklistBanGiao?: ChecklistBanGiaoItem[];
  @Column({ default: 'cho_duyet' }) trangThai: string; // cho_duyet|da_duyet|hoan_thanh|tu_choi
  @Column({ nullable: true }) soQuyetDinh?: string;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
  // Chụp lại Employee.trangThai NGAY TRƯỚC LÚC hồ sơ này lần đầu đẩy nhân
  // viên sang 'da_nghi' (tức lúc trangThai chuyển vào da_duyet/hoan_thanh).
  // Dùng để khôi phục đúng giá trị gốc (vd 'tam_nghi' — thai sản, nghỉ không
  // lương) khi hồ sơ bị huỷ duyệt hoặc xoá, thay vì ghi cứng 'dang_lam_viec'
  // và hồi sinh nhầm người vốn đã tạm nghỉ từ trước khi nộp đơn thôi việc.
  @Column({ nullable: true }) trangThaiNhanVienTruocKhiDuyet?: string;
  // Đánh dấu một CHUYỂN TIẾP DANG DỞ: đặt true trong pha 1 (ghi bền
  // snapshot ở trên, TRƯỚC khi đụng Employee), đặt false ngay khi lần ghi
  // hồ sơ CUỐI của quy trình duyệt/huỷ-duyệt đó hoàn tất. true nghĩa là NV
  // có thể đã bị ghi 'da_nghi' mà hồ sơ CHƯA kịp phản ánh — dấu hiệu DUY
  // NHẤT phân biệt "chuyển tiếp dang dở, cần vá" với "hồ sơ từng duyệt rồi
  // huỷ duyệt bình thường, snapshot chỉ còn là dấu vết lịch sử vô hại"
  // (round 5 — snapshot khác null KHÔNG đủ để suy ra dang dở, vì nó không
  // bao giờ bị xoá sau khi khôi phục).
  @Column({ nullable: true }) coChuyenTiepDangDo?: boolean;
}

export interface ResignationEntities { Resignation: typeof Resignation; }
declare module '../entities' { interface Entities extends ResignationEntities {} }
