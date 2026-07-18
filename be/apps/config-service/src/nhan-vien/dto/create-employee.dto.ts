import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  IsArray,
  IsObject,
} from 'class-validator';
import type { BangCap, NguoiPhuThuoc, LienHeKhanCap } from '@app/entities';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  hoTen: string;

  @IsString()
  @IsNotEmpty({ message: 'CCCD không được để trống' })
  cccd: string;

  @IsOptional()
  @IsString()
  ngaySinh?: string;

  @IsOptional()
  @IsIn(['nam', 'nu', 'khac'], { message: 'Giới tính không hợp lệ' })
  gioiTinh?: string;

  @IsOptional()
  @IsString()
  mst?: string;

  @IsOptional()
  @IsString()
  soDienThoai?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString()
  diaChi?: string;

  @IsOptional()
  @IsString()
  phongBan?: string;

  @IsOptional()
  @IsString()
  chucDanh?: string;

  @IsOptional()
  @IsString()
  ngayVaoLam?: string;

  @IsOptional()
  @IsIn(['thu_viec', 'chinh_thuc', 'dich_vu'], {
    message: 'Loại hợp đồng không hợp lệ',
  })
  loaiHopDong?: string;

  @IsOptional()
  @IsIn(['dang_lam_viec', 'da_nghi', 'tam_nghi'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThai?: string;

  @IsOptional()
  @IsArray()
  bangCap?: BangCap[];

  @IsOptional()
  @IsArray()
  nguoiPhuThuoc?: NguoiPhuThuoc[];

  @IsOptional()
  @IsObject()
  lienHeKhanCap?: LienHeKhanCap;
}
