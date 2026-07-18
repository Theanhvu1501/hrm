import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { NhomKhoanMucLoai } from '@app/entities';

export class CreateNhomKhoanMucDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  ma: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  ten: string;

  @IsEnum(NhomKhoanMucLoai)
  loai: NhomKhoanMucLoai;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  moTa?: string;
}
