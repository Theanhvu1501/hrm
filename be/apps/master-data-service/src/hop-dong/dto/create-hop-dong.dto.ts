import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDate,
  IsEnum,
  ValidateNested,
  IsInt,
  Min,
  IsMongoId,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TrangThaiHopDong } from '@app/entities/master-data/hop-dong.entity';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class PhuLucDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber()
  giaTri?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ngayKy?: Date;
}

export class DieuKhoanThanhToanDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber()
  tamUng?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber()
  thanhToanGiaiDoan?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber()
  quyetToan?: number;
}

export class BaoHanhDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber()
  giaTri?: number;

  @IsOptional()
  @IsString()
  thoiGian?: string;

  @IsOptional()
  @IsString()
  hinhThuc?: string;
}

export class TienDoThiCongDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsInt()
  @Min(0)
  soNgay?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  tuNgay?: Date;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  denNgay?: Date;
}

export class CreateHopDongDto {
  @IsString()
  @IsNotEmpty()
  soHopDong: string;

  @IsString()
  @IsNotEmpty()
  tenCongTrinh: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsInt()
  @Min(1900)
  nam?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber()
  giaTriSauThue?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ngayKy?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhuLucDto)
  phuLuc1?: PhuLucDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhuLucDto)
  phuLuc2?: PhuLucDto;

  @IsOptional()
  @IsMongoId()
  doiTuongId?: string;

  @IsOptional()
  @IsString()
  nguoiKy?: string;

  @IsOptional()
  @IsString()
  chucVu?: string;

  @IsOptional()
  @IsString()
  nguoiGiaoDich?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DieuKhoanThanhToanDto)
  dieuKhoanThanhToan?: DieuKhoanThanhToanDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BaoHanhDto)
  baoHanh?: BaoHanhDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TienDoThiCongDto)
  tienDoThiCong?: TienDoThiCongDto;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(TrangThaiHopDong)
  trangThai?: TrangThaiHopDong;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsInt()
  @Min(0)
  soLuongLuu?: number;
}
