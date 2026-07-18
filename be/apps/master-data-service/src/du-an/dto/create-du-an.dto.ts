import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DuAnStatus } from '@app/entities';

export class CreateDuAnDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  @IsOptional()
  ngayBatDau?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  @IsOptional()
  ngayKetThuc?: string;

  @IsString()
  @IsOptional()
  chuDauTuId?: string;

  @IsString()
  @IsOptional()
  chuDuAnMa?: string;

  @IsString()
  @IsOptional()
  chuDuAn?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(DuAnStatus)
  @IsOptional()
  trangThai?: DuAnStatus;

  @IsString()
  @IsOptional()
  moTa?: string;
}
