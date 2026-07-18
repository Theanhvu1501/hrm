import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateDonChamCongDto {
  @IsString()
  @IsNotEmpty({ message: 'Nhân viên không được để trống' })
  employeeId: string;

  @IsIn(['giai_trinh', 'lam_them_gio'], {
    message: 'Loại đơn không hợp lệ',
  })
  loaiDon: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngày không được để trống' })
  ngay: string;

  @IsOptional()
  @IsString()
  lyDo?: string;

  @IsOptional()
  @IsString()
  gioTu?: string;

  @IsOptional()
  @IsString()
  gioDen?: string;

  @IsOptional()
  @IsString()
  minhChung?: string;

  @IsOptional()
  @IsIn(['cho_duyet', 'da_duyet', 'tu_choi'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThai?: string;

  @IsOptional()
  @IsString()
  nguoiDuyet?: string;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
