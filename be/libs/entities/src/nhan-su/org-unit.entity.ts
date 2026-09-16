import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Cấp trong cây tổ chức. `chuc_danh` là LÁ — người được xếp vào lá này. */
export type LoaiDonVi = 'khoi' | 'phong_ban' | 'bo_phan' | 'chuc_danh';

/**
 * Một nút trong SƠ ĐỒ TỔ CHỨC (yêu cầu d13: "Chức danh: theo sơ đồ tổ chức —
 * cần có cấu hình sơ đồ tổ chức đồng bộ với phân quyền").
 *
 * Vì sao là cây tự quản thay vì dùng `departments` của identity-service:
 * identity chỉ có DANH MỤC PHẲNG phòng ban dùng chung cho mọi app trong nền
 * tảng, không có cấp bộ phận/chức danh và không có chỗ gắn vai trò. Sơ đồ tổ
 * chức là dữ liệu NGHIỆP VỤ của riêng app nhân sự; nhét vào identity là bắt
 * app kế toán và app giao việc mang theo khái niệm chúng không dùng.
 *
 * `departmentId` giữ đường nối sang danh mục cũ để hồ sơ nhân viên (đang lưu
 * `departmentId`) vẫn khớp được với một nhánh của cây.
 *
 * `vaiTro` là TÊN vai trò trong `phan_quyen` — chỗ "đồng bộ với phân quyền".
 * CỐ Ý là gợi ý chứ không phải ràng buộc: xếp một người vào chức danh KHÔNG
 * tự cấp quyền cho họ. Đổi một dòng trong sơ đồ tổ chức mà im lặng cấp thêm
 * quyền cho cả nhóm người là loại thay đổi không ai rà soát được.
 */
@Entity('so_do_to_chuc')
export class OrgUnit extends BaseEntity {
  @Column() ten: string;

  @Column({ default: 'phong_ban' })
  @Index()
  loai: LoaiDonVi;

  /** `null` = nút gốc. Chuỗi rỗng cũng coi là gốc (FE gửi '' khi xoá cha). */
  @Column({ nullable: true }) parentId?: string | null;

  /** Thứ tự hiển thị giữa các nút cùng cha. */
  @Column({ default: 0 }) thuTu: number;

  /** Tên vai trò trong `phan_quyen` gắn với chức danh này — chỉ để gợi ý. */
  @Column({ nullable: true }) vaiTro?: string;

  /** id phòng ban bên identity-service, nếu nút này ứng với một phòng ban ở đó. */
  @Column({ nullable: true }) departmentId?: string | null;

  @Column({ nullable: true }) moTa?: string;

  @Column({ default: true }) isActive: boolean;
}

export interface OrgUnitEntities {
  OrgUnit: typeof OrgUnit;
}

declare module '../entities' {
  interface Entities extends OrgUnitEntities {}
}
