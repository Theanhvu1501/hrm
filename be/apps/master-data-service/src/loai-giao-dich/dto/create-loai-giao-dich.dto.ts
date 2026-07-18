import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateLoaiGiaoDichDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã không được để trống' })
  @MaxLength(50, { message: 'Mã tối đa 50 ký tự' })
  ma: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @MaxLength(200, { message: 'Tên tối đa 200 ký tự' })
  ten: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Màu sắc tối đa 50 ký tự' })
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự' })
  moTa?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Mã loại chứng từ tối đa 50 ký tự' })
  loaiChungTuMa?: string;
}
