import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type LoaiPhieuTemplate = 'PHIEU_THU' | 'PHIEU_CHI' | 'HOP_DONG_LAO_DONG';

/**
 * Mẫu in (HTML) cho phiếu thu/chi/hợp đồng lao động — 1 bản/tenant/loại. Có
 * placeholder {{...}}. Rỗng (chưa cấu hình) → dùng mẫu mặc định dựng sẵn.
 *
 * `HOP_DONG_LAO_DONG` (P nhân sự — in hợp đồng lao động) tái dùng nguyên
 * entity/collection này thay vì tạo bảng riêng: đúng hình dạng "1 dòng/tenant/
 * loại, cột html chứa placeholder" mà module này vốn có, không có lý do
 * reinvent. Route CRUD cho loại này KHÔNG nằm ở `phieu-template.controller.ts`
 * (controller đó dùng `AdminGuard` — không đúng khuôn phân quyền hiện tại,
 * xem CLAUDE.md mục "Known limitations" #3), mà nằm ở
 * `hop-dong.controller.ts`, gọi qua `PhieuTemplate_Service` (export từ
 * `PhieuTemplate_Module`) nhưng gác bằng `PermissionGuard` +
 * `@Permissions('/nhan-su/hop-dong-lao-dong:...')` — cùng quyền với CRUD hợp
 * đồng, không cần khai thêm permission module mới.
 */
@Entity('phieu_template')
export class PhieuTemplate extends BaseEntity {
  @Column()
  loai: LoaiPhieuTemplate;

  @Column()
  html: string;
}

export interface PhieuTemplateEntities {
  PhieuTemplate: typeof PhieuTemplate;
}

declare module '../entities' {
  interface Entities extends PhieuTemplateEntities {}
}
