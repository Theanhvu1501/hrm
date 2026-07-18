import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateDiaDiemChamCongDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên địa điểm không được để trống' })
  ten: string;

  @IsString()
  @IsNotEmpty({ message: 'Loại địa điểm không được để trống' })
  loai: string; // gps|wifi|qr

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  banKinh?: number;

  @IsOptional()
  @IsString()
  ipWifi?: string;

  @IsOptional()
  @IsString()
  maQr?: string;

  @IsOptional()
  @IsString()
  diaChi?: string;

  @IsOptional()
  @IsString()
  chiNhanh?: string;

  @IsOptional()
  @IsString()
  phongBan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
