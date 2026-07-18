import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  IsDateString,
  Min,
} from 'class-validator';

export const THUE_SUAT_VALUES = ['0', '5', '8', '10', 'KCT', 'KKKT'];

export class CreateBangKeMuaVaoDto {
  @IsDateString()
  ngayHoaDon: string;

  @IsString()
  @IsNotEmpty()
  soHoaDon: string;

  @IsString()
  @IsOptional()
  kyHieuHoaDon?: string;

  @IsString()
  @IsNotEmpty()
  tenNguoiBan: string;

  @IsString()
  @IsOptional()
  mstNguoiBan?: string;

  @IsString()
  @IsOptional()
  tenHangHoa?: string;

  @IsNumber()
  giaTriChuaThue: number;

  @IsString()
  @IsIn(THUE_SUAT_VALUES)
  thueSuat: string;

  // Để trống → service tính theo công thức. Nhập số → tôn trọng số trên hóa đơn
  // (nhà cung cấp tính thuế trên từng dòng hàng nên hay lệch vài đồng so với tính trên tổng).
  @IsNumber()
  @IsOptional()
  @Min(0)
  tienThue?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  tongThanhToan?: number;

  @IsString()
  @IsOptional()
  ghiChu?: string;

  @IsString()
  @IsOptional()
  chungTuId?: string;

  @IsString()
  @IsOptional()
  soChungTu?: string;
}
