import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHangHoaVatTuDto {
  @IsString() @IsNotEmpty() ma: string;
  @IsString() @IsNotEmpty() ten: string;
  @Transform(({ value }) => (value === '' ? undefined : value)) @IsString() @IsOptional() @IsIn(['TAI_SAN', 'HANG_HOA', 'NGUYEN_LIEU']) tinhChat?: string;
  @IsString() @IsOptional() donViTinhMa?: string;
  @IsString() @IsOptional() donViTinhTen?: string;
  @IsString() @IsOptional() nhomVatTuMa?: string;
  @IsString() @IsOptional() nhomVatTuTen?: string;
  @IsString() @IsOptional() quyCach?: string;
  @IsString() @IsOptional() tkKho?: string;
  @Transform(({ value }) => (value === '' ? undefined : value)) @IsNumber() @IsOptional() donGia?: number;
  @IsString() @IsOptional() moTa?: string;
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsOptional()
  @IsIn(['DINH_LUONG', 'THEO_SUAT', 'DON_VI'])
  cachXuat?: 'DINH_LUONG' | 'THEO_SUAT' | 'DON_VI';
}
