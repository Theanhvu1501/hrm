import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
} from 'class-validator';

export class CreateHopDongDto {
  @IsString()
  @IsNotEmpty({ message: 'Nhân viên không được để trống' })
  employeeId: string;

  @IsIn(['thu_viec', 'xac_dinh_thoi_han', 'khong_xac_dinh_thoi_han', 'dich_vu'], {
    message: 'Loại hợp đồng không hợp lệ',
  })
  loaiHopDong: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  // Snapshot chức danh tại thời điểm ký — xem chú thích entity vì sao KHÔNG
  // suy ra từ Employee.chucDanh lúc render.
  @IsOptional()
  @IsString()
  chucDanh?: string;

  @IsOptional()
  @IsString()
  ngayBatDau?: string;

  @IsOptional()
  @IsString()
  ngayKetThuc?: string;

  @IsOptional()
  @IsNumber()
  mucLuong?: number;

  @IsOptional()
  @IsNumber()
  phuCap?: number;

  @IsOptional()
  @IsIn(['gross', 'net'], { message: 'Hình thức trả lương không hợp lệ' })
  hinhThucTraLuong?: string;

  @IsOptional()
  @IsIn(['du_thao', 'dang_hieu_luc', 'het_han', 'da_thanh_ly'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThai?: string;

  @IsOptional()
  @IsString()
  ghiChu?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
