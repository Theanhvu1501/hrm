import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import type { PhanLoaiChungTu } from '@app/entities';

export class CreateLoaiChungTuDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  moTa?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsIn(['THU', 'CHI', 'KHAC'])
  @IsOptional()
  phanLoai?: PhanLoaiChungTu;
}
