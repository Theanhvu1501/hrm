import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { DanhMuc } from '@app/entities';

export class UpdateChungTuDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  ngay?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsNumber()
  @Min(0)
  soTien?: number;

  @IsOptional()
  @IsString()
  noiDung?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nguoiGiaoDich?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diaChi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ghiChu?: string;

  @IsOptional()
  @IsObject()
  danhMuc?: DanhMuc;
}
