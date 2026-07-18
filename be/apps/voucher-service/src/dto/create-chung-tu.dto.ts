import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import type { LoaiChungTu, DanhMuc } from '@app/entities';

export class CreateChungTuDto {
  @IsNotEmpty()
  @IsIn(['PHIEU_THU', 'PHIEU_CHI'])
  loai: LoaiChungTu;

  @IsNotEmpty()
  @IsDateString()
  ngay: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  soTien: number;

  @IsNotEmpty()
  @IsString()
  noiDung: string;

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
