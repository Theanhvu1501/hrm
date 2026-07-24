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
 * Body của `POST /phan-quyen`.
 *
 * Trước đây route khai `@Body() createDto: any`. `any` không có metatype thật
 * đứng sau, nên `ValidationPipe` toàn cục (`whitelist`,
 * `forbidNonWhitelisted` — xem `config-service/src/main.ts`) BỎ QUA HOÀN TOÀN
 * tham số đó: mọi trường lạ đi thẳng vào `repo.create(data)`, và
 * `permissions` nhận được cả `['*']` — chuỗi mà `PermissionGuard` hiểu là
 * toàn quyền super admin.
 *
 * `isActive` CỐ Ý không có mặt: `delete()` (route `@Delete` — quyền `:xoa`)
 * là đường duy nhất tắt một vai trò. Cho `isActive` vào đây là để người chỉ
 * có `:them`/`:sua` làm được đúng việc của `:xoa` bằng một cái tên khác.
 */
export class CreatePhanQuyenDto {
  @IsString()
  @IsNotEmpty()
  vaiTro: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

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
