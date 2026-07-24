import { IsArray, IsString, Matches } from 'class-validator';

/**
 * Khuôn của MỘT chuỗi quyền ghi vào `phan_quyen.permissions`.
 *
 * Tách ra hằng số dùng chung (thay vì chép lại regex ở từng DTO) vì bảng này
 * là nguồn thẩm quyền thật của toàn bộ controller chấm công/nhân sự: chỉ cần
 * MỘT đường ghi lỏng hơn các đường còn lại là đủ để tự cấp toàn quyền. Đáng
 * chú ý nhất: khuôn này KHÔNG khớp `'*'` — mà `PermissionGuard` lại coi đúng
 * chuỗi `'*'` là toàn quyền của super admin. Chép tay regex sang DTO khác rồi
 * lỡ tay nới một ký tự là mở lại đúng lỗ đó.
 */
export const MAU_CHUOI_QUYEN =
  /^\/[a-z0-9-]+(\/[a-z0-9-]+)*:(xem|them|sua|xoa|xuat)$/;

export const THONG_BAO_MAU_CHUOI_QUYEN =
  'Permission phải có format /module:action (vd: /danh-muc/tai-khoan:xem)';

export class UpsertPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @Matches(MAU_CHUOI_QUYEN, {
    each: true,
    message: THONG_BAO_MAU_CHUOI_QUYEN,
  })
  permissions: string[];
}
