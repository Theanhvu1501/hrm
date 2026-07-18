import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { KhoanMucLoai } from '@app/entities';

export class CreateKhoanMucDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsEnum(KhoanMucLoai)
  loai: KhoanMucLoai;

  @IsString()
  @IsOptional()
  nhom?: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
