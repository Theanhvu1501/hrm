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

export class CreateHoaDonBanRaDto {
  @IsOptional() @IsString() soHoaDon?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsDateString() ngay?: string;
  @IsOptional() @IsString() noiDung?: string;
  @IsString() @IsNotEmpty() hopDongId: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() tenCongTrinh?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() donViMua?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() tienHang?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() tienThue?: number;
  @IsNumber() tong: number;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() lan?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() nam?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() namHoaDon?: number;
}

export class UpdateHoaDonBanRaDto {
  @IsOptional() @IsString() soHoaDon?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsDateString() ngay?: string;
  @IsOptional() @IsString() noiDung?: string;
  @IsOptional() @IsString() hopDongId?: string;
  @IsOptional() @IsString() soHopDong?: string;
  @IsOptional() @IsString() tenCongTrinh?: string;
  @IsOptional() @IsString() doiTuongId?: string;
  @IsOptional() @IsString() donViMua?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() tienHang?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() tienThue?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsNumber() tong?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() lan?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() nam?: number;
  @Transform(emptyToUndefined) @IsOptional() @IsInt() namHoaDon?: number;
}
