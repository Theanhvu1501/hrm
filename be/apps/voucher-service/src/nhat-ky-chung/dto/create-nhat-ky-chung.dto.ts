import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  IsObject,
  Min,
} from 'class-validator';
import type { LoaiChungTu, DanhMuc } from '@app/entities';

export class CreateNhatKyChungDto {
  @IsNotEmpty()
  @IsIn(['PHIEU_THU', 'PHIEU_CHI'])
  loai: LoaiChungTu;

  @IsNotEmpty()
  @IsDateString()
  ngay: string;

  // Ngày ghi sổ (mặc định = ngày phát sinh CT nếu không truyền). Không ảnh hưởng logic báo cáo.
  @IsOptional()
  @IsDateString()
  ngayGhiSo?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  soTien: number;

  @IsNotEmpty()
  @IsString()
  noiDung: string;

  @IsOptional()
  @IsObject()
  danhMuc?: DanhMuc;

  @IsOptional()
  @IsString()
  ghiChu?: string;

  @IsOptional()
  @IsString()
  nguoiGiaoDich: string;

  @IsOptional()
  @IsString()
  diaChi: string;

  // Khoá gom dòng khi import: các dòng cùng nhomGop → 1 chứng từ (chung soPhieu). Không lưu DB.
  @IsOptional()
  @IsString()
  nhomGop?: string;
}
