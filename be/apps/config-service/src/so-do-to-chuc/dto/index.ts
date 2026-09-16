import { PartialType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const LOAI = ['khoi', 'phong_ban', 'bo_phan', 'chuc_danh'] as const;

/**
 * `main.ts` bật `forbidNonWhitelisted` — trường nào FE gửi mà thiếu ở đây là
 * cả form 400, không phải bị bỏ qua im lặng.
 */
export class CreateOrgUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên đơn vị không được để trống' })
  ten: string;

  @IsOptional()
  @IsIn(LOAI, { message: 'Loại đơn vị không hợp lệ' })
  loai?: (typeof LOAI)[number];

  // Chuỗi rỗng = chuyển về gốc. Không dùng @IsNotEmpty ở đây.
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  thuTu?: number;

  @IsOptional()
  @IsString()
  vaiTro?: string;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  moTa?: string;
}

/**
 * Sửa đơn vị: mọi trường đều không bắt buộc.
 *
 * `PartialType` thay vì kế thừa rồi khai lại `ten` — khai lại sẽ ghi đè
 * decorator của lớp cha và TypeScript báo TS2612 (thuộc tính che mất thuộc
 * tính cùng tên của lớp cơ sở).
 */
export class UpdateOrgUnitDto extends PartialType(CreateOrgUnitDto) {}
