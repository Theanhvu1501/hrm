import { IsOptional, IsString } from 'class-validator';

/**
 * Thông tin pháp lý công ty dùng để in tiêu đề hợp đồng lao động — lưu ở
 * TenantAppConfig (xem chú thích trong entity). Tất cả optional: rỗng → hiện
 * khoảng trống trên bản in, không bịa giá trị.
 */
export class UpdateThongTinCongTyDto {
  @IsOptional()
  @IsString()
  tenCongTy?: string;

  @IsOptional()
  @IsString()
  diaChiCongTy?: string;

  @IsOptional()
  @IsString()
  maSoThue?: string;

  @IsOptional()
  @IsString()
  nguoiDaiDien?: string;

  @IsOptional()
  @IsString()
  chucVuNguoiDaiDien?: string;

  @IsOptional()
  @IsString()
  thanhPhoKy?: string;

  @IsOptional()
  @IsString()
  maHopDongMau?: string;
}
