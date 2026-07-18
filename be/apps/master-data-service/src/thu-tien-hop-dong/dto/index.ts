import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class CreateThuTienHopDongDto {
  @Transform(emptyToUndefined) @IsOptional() @IsInt() nam?: number;
  @IsString() @IsNotEmpty() hopDongId: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() tenKhachHang?: string;
  @IsOptional() @IsString() noiDung?: string;
  @IsNumber() soTien: number;
  @Transform(emptyToUndefined) @IsOptional() @IsDateString() ngay?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() lan?: number;
  @IsOptional() @IsString() ghiChu?: string;
}

export class UpdateThuTienHopDongDto {
  @Transform(emptyToUndefined) @IsOptional() @IsInt() nam?: number;
  @IsOptional() @IsString() hopDongId?: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() tenKhachHang?: string;
  @IsOptional() @IsString() noiDung?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() soTien?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsDateString() ngay?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() lan?: number;
  @IsOptional() @IsString() ghiChu?: string;
}
