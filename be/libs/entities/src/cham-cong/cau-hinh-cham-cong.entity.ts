import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Cấu hình chấm công mức CÔNG TY — một bản ghi duy nhất, cùng khuôn singleton
 * với `CauHinhLuong` (tự sinh từ seed lần đọc đầu tiên, không migration).
 *
 * Tồn tại vì trước P4.5 lịch làm việc tuần CHỈ có ở mức từng nhân viên, nên
 * ai chưa được HR khai tay thì T7/CN bị coi là ngày làm việc ⇒ mỗi người 4–5
 * ô chưa xử lý mỗi tháng ⇒ không chốt được bảng công ⇒ không lên được lương.
 */
@Entity('cau_hinh_cham_cong')
export class CauHinhChamCong extends BaseEntity {
  /** 0=CN … 6=T7. Rỗng = HR cố ý bỏ trống ⇒ rơi về đáy "mọi ngày là ngày làm việc". */
  @Column('json', { nullable: true }) ngayLamViecTrongTuan: number[];
  /**
   * Cho phép nhân viên TỰ KHAI "làm từ xa" khi bấm chấm công (yêu cầu d16).
   *
   * Mặc định TẮT và đó là chủ ý: bật lên nghĩa là ai cũng bỏ qua được đối
   * chiếu địa điểm chỉ bằng cách chọn một ô — hàng rào GPS coi như không còn.
   * Công ty nào chấp nhận đánh đổi đó thì tự bật; còn lại vẫn đi đường đơn
   * `lam_online` có người duyệt.
   */
  @Column({ default: false }) choPhepTuKhaiTuXa: boolean;
  @Column({ default: true }) isActive: boolean;
}

export interface CauHinhChamCongEntities { CauHinhChamCong: typeof CauHinhChamCong; }
declare module '../entities' { interface Entities extends CauHinhChamCongEntities {} }
