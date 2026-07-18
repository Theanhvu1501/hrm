import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { LoaiTaiKhoan, NhomTaiKhoan, ChiTietTheo, FieldRules } from '@app/entities';

export class CreateTaiKhoanDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  capDo: number;

  @IsEnum(LoaiTaiKhoan)
  loai: LoaiTaiKhoan;

  @IsEnum(NhomTaiKhoan)
  nhom: NhomTaiKhoan;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  moTa?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ChiTietTheo)
  @IsOptional()
  chiTietTheo?: ChiTietTheo;

  @IsObject()
  @IsOptional()
  fieldRules?: FieldRules | null;
}
