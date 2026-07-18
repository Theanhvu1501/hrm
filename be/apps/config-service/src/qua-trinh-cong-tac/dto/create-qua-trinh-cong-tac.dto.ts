import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber } from 'class-validator';

export class CreateQuaTrinhCongTacDto {
  @IsString()
  @IsNotEmpty({ message: 'Nhân viên không được để trống' })
  employeeId: string;

  @IsIn(['dieu_chuyen', 'tang_luong', 'bo_nhiem', 'doi_trang_thai', 'danh_gia'], {
    message: 'Loại thay đổi không hợp lệ',
  })
  loaiThayDoi: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngày hiệu lực không được để trống' })
  ngayHieuLuc: string;

  @IsOptional()
  @IsString()
  phongBanMoi?: string;

  @IsOptional()
  @IsString()
  chucDanhMoi?: string;

  @IsOptional()
  @IsIn(['dang_lam_viec', 'tam_nghi', 'da_nghi'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThaiMoi?: string;

  @IsOptional()
  @IsNumber()
  mucLuongMoi?: number;

  @IsOptional()
  @IsString()
  soQuyetDinh?: string;

  @IsOptional()
  @IsString()
  lyDo?: string;

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
