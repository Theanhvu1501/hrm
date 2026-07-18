import { IsString, IsOptional, IsNumber, IsIn, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ChiTietPhieuKhoDto } from './chi-tiet-phieu-kho.dto';

export class CreatePhieuKhoDto {
  @IsString() @IsIn(['NHAP', 'XUAT', 'CHUYEN']) loaiPhieu: string;
  @IsString() @IsOptional() soPhieu?: string;          // BE tự sinh nếu rỗng
  @IsString() @IsOptional() loaiNghiepVu?: string;
  @IsDateString() ngayHachToan: string;
  @Transform(({ value }) => (value === '' ? undefined : value)) @IsDateString() @IsOptional() ngayChungTu?: string;
  @IsString() @IsOptional() soChungTuGoc?: string;
  @IsString() @IsOptional() thamChieu?: string;
  @IsString() @IsOptional() doiTuongMa?: string;
  @IsString() @IsOptional() doiTuongTen?: string;
  @IsString() @IsOptional() diaChi?: string;
  @IsString() @IsOptional() nguoiGiaoNhan?: string;
  @IsString() @IsOptional() nhanVien?: string;
  @IsString() @IsOptional() dienGiai?: string;
  @IsString() @IsOptional() khoMa?: string;
  @IsString() @IsOptional() khoTen?: string;
  @IsString() @IsOptional() khoXuatMa?: string;
  @IsString() @IsOptional() khoXuatTen?: string;
  @IsString() @IsOptional() khoNhapMa?: string;
  @IsString() @IsOptional() khoNhapTen?: string;
  @IsString() @IsOptional() nguoiVanChuyen?: string;
  @IsString() @IsOptional() hopDongVC?: string;
  @IsString() @IsOptional() phuongTienVC?: string;
  @IsString() @IsOptional() lenhDieuDong?: string;
  @IsString() @IsOptional() veViec?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChiTietPhieuKhoDto) chiTiet: ChiTietPhieuKhoDto[];
  @Transform(({ value }) => (value === '' ? undefined : value)) @IsNumber() @IsOptional() tongTien?: number;
  @IsString() @IsOptional() tongTienBangChu?: string;
  @IsString() @IsOptional() trangThai?: string;
}
