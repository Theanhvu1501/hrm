import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSanPhamDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  donVi?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNumber()
  @IsOptional()
  giaBan?: number;

  @IsString()
  @IsOptional()
  nhom?: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
