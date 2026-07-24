import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  MAU_CHUOI_QUYEN,
  THONG_BAO_MAU_CHUOI_QUYEN,
} from './upsert-permissions.dto';

/**
 * Body của `PUT /phan-quyen/:id` — đường ghi NGẮN NHẤT tới bảng thẩm quyền
 * của cả hệ thống, nên là DTO phải canh kỹ nhất trong module.
 *
 * Route này từng khai `@Body() updateDto: any`. Vì `any` không có metatype,
 * `ValidationPipe` toàn cục bỏ qua hoàn toàn, và `PhanQuyen_Service.update()`
 * thì `Object.assign(item, data)` — nên một nhân viên thường chỉ cần
 * `PUT /config/phan-quyen/<id vai trò của mình>` với `{"permissions":["*"]}`
 * là có toàn quyền sau ≤30s (TTL cache của `AuthzLoaderService`). Đường vòng
 * qua `PUT vai-tro/:vaiTro/permissions` khó hơn nhiều vì `UpsertPermissionsDto`
 * chặn `'*'` — chính sự lệch nhau giữa hai đường ghi là lỗ hổng. Nên
 * `permissions` ở đây chịu ĐÚNG một khuôn với DTO kia (`MAU_CHUOI_QUYEN`).
 *
 * `isActive` CỐ Ý không có mặt — xem lý do ở `CreatePhanQuyenDto`.
 */
export class UpdatePhanQuyenDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  vaiTro?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ten?: string;

  @IsOptional()
  @IsString()
  moTa?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(MAU_CHUOI_QUYEN, {
    each: true,
    message: THONG_BAO_MAU_CHUOI_QUYEN,
  })
  permissions?: string[];
}
