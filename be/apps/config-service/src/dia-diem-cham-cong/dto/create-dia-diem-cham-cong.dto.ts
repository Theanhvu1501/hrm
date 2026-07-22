import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class CreateDiaDiemChamCongDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên địa điểm không được để trống' })
  ten: string;

  @IsIn(['gps', 'wifi', 'qr'], {
    message: 'Loại địa điểm phải là gps, wifi hoặc qr',
  })
  loai: string; // gps|wifi|qr

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(20, {
    message:
      'Bán kính tối thiểu 20m — nhỏ hơn thì sai số GPS đời thường sẽ gắn cờ nhầm người đi làm thật',
  })
  @Max(5000, { message: 'Bán kính tối đa 5000m' })
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
