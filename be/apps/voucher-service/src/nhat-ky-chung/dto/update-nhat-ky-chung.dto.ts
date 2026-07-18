import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  IsString,
  IsArray,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { DanhMuc, HoSoChungTuChungTu, KiemSoatChungTu } from '@app/entities';

export class UpdateNhatKyChungDto {
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  ngay?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  ngayGhiSo?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  soTien?: number;

  @IsOptional()
  @IsString()
  noiDung?: string;

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

  @IsOptional()
  @IsArray()
  hoSoChungTu?: HoSoChungTuChungTu[];

  @IsOptional()
  @IsObject()
  kiemSoat?: KiemSoatChungTu;
}
