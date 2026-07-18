import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNhomKhuyenMaiDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
