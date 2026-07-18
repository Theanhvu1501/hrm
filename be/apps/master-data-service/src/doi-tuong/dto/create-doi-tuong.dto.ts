import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DoiTuongType } from '@app/entities';

export class CreateDoiTuongDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(DoiTuongType, { each: true })
  loai: DoiTuongType[];

  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  diaChi?: string;

  @IsString()
  @IsOptional()
  soDienThoai?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  maSoThue?: string;

  @IsString()
  @IsOptional()
  nguoiLienHe?: string;
}
