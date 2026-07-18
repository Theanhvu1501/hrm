import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateCaLamViecDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên ca không được để trống' })
  ten: string;

  @IsString()
  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  gioBatDau: string;

  @IsString()
  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  gioKetThuc: string;

  @IsOptional()
  @IsString()
  gioNghiTu?: string;

  @IsOptional()
  @IsString()
  gioNghiDen?: string;

  @IsOptional()
  @IsBoolean()
  laLinhHoat?: boolean;

  @IsOptional()
  @IsNumber()
  soPhutLinhHoat?: number;

  @IsOptional()
  @IsString()
  moTa?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
