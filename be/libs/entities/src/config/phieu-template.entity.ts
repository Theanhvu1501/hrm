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
 * mà nằm ở `hop-dong.controller.ts`, gọi qua `PhieuTemplate_Service` (export
 * từ `PhieuTemplate_Module`) nhưng gác bằng `PermissionGuard` +
 * `@Permissions('/nhan-su/hop-dong-lao-dong:...')` — cùng quyền với CRUD hợp
 * đồng, không cần khai thêm permission module mới.
 *
 * SỬA LẠI (review): bản chú thích trước ghi sai rằng `AdminGuard` "không
 * đúng khuôn phân quyền" ngụ ý nó bị vô hiệu — SAI. `AdminGuard` (khác hẳn
 * `RoleGuard`, cái THỰC SỰ vô hiệu — xem CLAUDE.md #3) hoạt động thật: nó
 * uppercase `user.vaiTro` và cho qua nếu bằng `ADMIN`/`SUPER_ADMIN`; vai trò
 * thật trong dữ liệu là chuỗi `"Admin"` nên VẪN qua được. Lý do đúng để
 * tránh `phieu-template.controller.ts` là nó dùng mô hình phân quyền theo
 * VAI TRÒ (coarse, bất kỳ ai có vaiTro Admin ở BẤT KỲ tenant/module nào) thay
 * vì theo QUYỀN CHI TIẾT (`PermissionGuard` + `@Permissions`) mà phần còn lại
 * của app dùng — không phải vì guard đó "chết". Vì route đó vẫn sống và vẫn
 * nhận ghi, `PhieuTemplate_Service.upsert/findByLoai/remove` CHỦ ĐỘNG chặn
 * `loai === 'HOP_DONG_LAO_DONG'` (xem service) để nó không thể trở thành
 * đường ghi/đọc thứ hai, không qua sanitize, vào CÙNG bản ghi mà
 * `hop-dong.controller.ts` quản lý.
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
