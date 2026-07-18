import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { NganHangLoai } from '@app/entities';

export class CreateNganHangDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsEnum(NganHangLoai)
  loai: NganHangLoai;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNumber()
  @IsOptional()
  soDu?: number;

  @IsString()
  @IsOptional()
  nganHang?: string;

  @IsString()
  @IsOptional()
  soTaiKhoan?: string;

  @IsString()
  @IsOptional()
  chiNhanh?: string;

  @IsString()
  @IsOptional()
  chuTaiKhoan?: string;

  @IsBoolean()
  @IsOptional()
  trangThai?: boolean;
}
